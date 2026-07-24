import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { V1_FEATURE_FLAGS, V1_GATED_API_PREFIXES } from '../../config/v1-feature-scope';

/**
 * C2 — V1 Scope Lockdown. Enforced once, centrally, ahead of every guard
 * and controller, so a new sub-controller added under a gated domain
 * (e.g. another apps/api/src/pods/**\/*.controller.ts) is closed by
 * construction rather than by remembering to annotate it.
 *
 * 404, not 403 — an unreachable-for-V1 route should look absent, not
 * merely forbidden.
 */
@Injectable()
export class V1ScopeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // req.path reads as '/' here — Express 5 rewrites it relative to the
    // '*' mount point set up by forRoutes('*'). req.originalUrl is always
    // the untouched incoming path, regardless of mounting.
    const path = req.originalUrl.split('?')[0];
    const gate = V1_GATED_API_PREFIXES.find(
      ({ prefix }) => path === prefix || path.startsWith(`${prefix}/`),
    );

    if (gate && !V1_FEATURE_FLAGS[gate.feature]) {
      res.status(404).json({ statusCode: 404, message: 'Not Found' });
      return;
    }

    next();
  }
}
