import { Observable, OperatorFunction, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Types of signals that can be emitted to kill targeted processes.
 */
export enum CommandAbortSignalType {
	PENDING = 'PENDING',
	ACTIVE = 'ACTIVE',
	ALL = 'ALL'
}

/**
 * Type thrown when an abort signal is emitted.
 */
export class CommandAbortSignalError extends Error {

	constructor(
		public readonly type: CommandAbortSignalType,
		message?: string
	) {
		super(message);
	}
}

/**
 * Utility operator to inject an CommandAbortSignalError instance into a stream.
 */
export function throwAbortSignalError<T>(): OperatorFunction<CommandAbortSignalType, T> {
	return source => source.pipe(
		mergeMap((v: CommandAbortSignalType) => throwError(() => new CommandAbortSignalError(v)))
	);
}

/**
 * Utility to convert a normal stream into one that will throw on emission.
 */
export function castAbortSignalStream<T>(input: Observable<CommandAbortSignalType>): Observable<T> {
	return input.pipe(
		throwAbortSignalError<T>()
	);
}