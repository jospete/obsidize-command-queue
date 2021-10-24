import { Subject, Observable, defer } from 'rxjs';
import { concatMap, share, filter, mergeMap, switchMap } from 'rxjs/operators';

import { CommandAction, CommandConfig, CommandContext } from './command-context';
import { rxPollyfillLastValueFrom } from './utility';

/**
 * A stupidly simple queueing mechanism that guarantees order of execution,
 * based on a first-come-first-serve precedent.
 */
export class CommandQueue {

	// Internal context input stream to trigger actions from
	private readonly mContextInputSubject = new Subject<CommandContext<any>>();

	/**
	 * Stream of context results that will be emitted as 
	 * each action finishes (either with a result or with an error)
	 */
	public readonly results = this.mContextInputSubject.asObservable().pipe(
		concatMap((context: CommandContext<any>) => context.run()!),
		share()
	);

	/**
	 * Fallback command options that will be used when not
	 * supplied in one of the enqueueing methods.
	 */
	public readonly rootConfig: CommandConfig<any> = {
		timeoutMs: 30000,
		mocked: false
	};

	// Locks the "results" stream to an active state by ensuring at least one subscription exists.
	private readonly mActivatorSub = this.results.subscribe();

	/**
	 * Generates a configuration instance by filling in missing properties from
	 * the given config with known ones from the root config.
	 */
	public createConfig<T>(config?: Partial<CommandConfig<T>>): CommandConfig<T> {
		return Object.assign({}, this.rootConfig, config);
	}

	/**
	 * Add an action to the queue for pending execution.
	 * Does not execute until all preceding tasks have completed.
	 */
	public add<T>(action: CommandAction<T>, config?: CommandConfig<T>): Promise<T> {
		return rxPollyfillLastValueFrom(this.enqueue(action, config));
	}

	/**
	 * Special flavor of add() whose value is a pending observable.
	 * The inner observable will not be created until all preceding tasks have completed.
	 */
	public observe<T, R extends Observable<T>>(action: CommandAction<R>, config?: CommandConfig<R>): Observable<T> {
		return this.enqueue(action, config).pipe(
			switchMap((value: R) => value!)
		);
	}

	/**
	 * Tear-down option that cleans up the internal rxjs refs.
	 * CommandQueue references should be disposed of after this is called.
	 */
	public destroy(): void {
		this.mActivatorSub.unsubscribe();
		this.mContextInputSubject.complete();
		this.mContextInputSubject.unsubscribe();
	}

	/**
	 * Internal queueing mechanism for commands.
	 * 
	 * This performs minimal unwrapping and may not emit as expected for the external api, 
	 * so we intentionally will not expose it directly.
	 */
	private enqueue<T>(action: CommandAction<T>, config?: Partial<CommandConfig<T>>): Observable<T> {

		const context = new CommandContext<T>(action, this.createConfig(config));

		const outputStream = this.results.pipe(
			filter((update: CommandContext<any>) => (update === context)),
			mergeMap((update: CommandContext<T>) => update.unwrap())
		);

		return defer(() => {
			this.mContextInputSubject.next(context);
			return outputStream;
		});
	}
}