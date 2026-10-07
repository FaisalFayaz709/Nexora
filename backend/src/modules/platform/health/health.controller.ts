import type { FastifyReply, FastifyRequest } from 'fastify';
import { dataEnvelope } from '../../../core/http/envelope.js';
import type { HealthService } from './health.service.js';
export class HealthController {
  constructor(private readonly service: HealthService) {}
  live = async (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send(dataEnvelope(this.service.live(), request.id));
  ready = async (request: FastifyRequest, reply: FastifyReply) => reply.code(200).send(dataEnvelope(this.service.ready(), request.id));
}
