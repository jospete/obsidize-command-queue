import { Observable, OperatorFunction } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { rxPollyfillThrowError } from './utility';

/**
 * Types of signals that can be emitted to kill targeted processes.
 */
export enum CommandAbortSignalType {
	PENDING = 'PENDING',
	ACTIVE = 'ACTIVE',
	ALL = 'ALL'
}

/**
 * Checks if a target value is a valid abort signal type.
 */
export function isCommandAbortSignalType(value: any): boolean {
	return Object.values(CommandAbortSignalType).includes(value);
}

/**
 * Type thrown when an abort signal is emitted.
 */
export class CommandAbortSignalError extends Error {

	constructor(
		public readonly abortSignalType: CommandAbortSignalType,
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
		switchMap((v: CommandAbortSignalType) => rxPollyfillThrowError<T>(new CommandAbortSignalError(v)))
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