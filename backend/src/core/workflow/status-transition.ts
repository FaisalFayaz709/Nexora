import { AppError } from '../http/errors.js';

export type StatusTransitionMap<TStatus extends string> = Readonly<Record<TStatus, readonly TStatus[]>>;

export interface StatusTransitionOptions<TStatus extends string> {
  readonly subjectType: string;
  readonly subjectId?: string;
  readonly currentStatus: TStatus;
  readonly nextStatus: TStatus;
  readonly allowed: StatusTransitionMap<TStatus>;
  readonly action?: string;
}

export function assertAllowedStatusTransition<TStatus extends string>(
  options: StatusTransitionOptions<TStatus>,
): void {
  const allowedNext = options.allowed[options.currentStatus] ?? [];
  if (!allowedNext.includes(options.nextStatus)) {
    throw new AppError(
      409,
      `${options.subjectType.toUpperCase()}_INVALID_STATE_TRANSITION`,
      `${options.subjectType} cannot move from ${options.currentStatus} to ${options.nextStatus}.`,
      {
        subjectType: options.subjectType,
        subjectId: options.subjectId,
        action: options.action,
        currentStatus: options.currentStatus,
        requestedStatus: options.nextStatus,
        allowedNextStatuses: allowedNext,
      },
    );
  }
}

export function nextStatusForCommand<TCommand extends string, TStatus extends string>(
  command: TCommand,
  transitions: Readonly<Record<TCommand, TStatus>>,
): TStatus {
  const next = transitions[command];
  if (!next) {
    throw new AppError(400, 'WORKFLOW_COMMAND_UNKNOWN', 'Unknown workflow command.', { command });
  }
  return next;
}
