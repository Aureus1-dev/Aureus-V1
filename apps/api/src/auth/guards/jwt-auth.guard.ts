import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid, non-expired JWT access token in the Authorization header. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
