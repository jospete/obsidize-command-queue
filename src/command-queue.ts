import { Subject, Observable, defer, merge, BehaviorSubject } from 'rxjs';
import { concatMap, share, switchMap, first, filter, takeUntil } from 'rxjs/operators';

import { castAbortSignalStream, CommandAbortSignalType } from './command-abort-signal';
import { CommandAction, CommandConfig, CommandContext } from './command-context';
import { destroyManySubjectsSafe, rxPolyfillLastValueFrom } from './utility';

/**
 * A stupidly simple queueing mechanism that guarantees order of execution,
 * based on a first-come-first-serve precedent.
 */
export class CommandQueue {

	// Internal context input stream to trigger actions from
	private readonly mContextInputSubject = new Subject<CommandContext<any>>();

	// Internal emitter for abort signals to kill specified tasks
	private readonly mAbortSignalSubject = new Subject<CommandAbortSignalType>();

	// Internal context change emitter to indicate a new context has started
	private readonly mActiveContextChangeSubject = new BehaviorSubject<CommandContext<any> | null>(null);

	/**
	 * Emits when the running context has shifted to a new value.
	 * Emits null when there is no running context.
	 */
	public readonly activeContextChange = this.mActiveContextChangeSubject.asObservable().pipe(
		share()
	);

	/**
	 * Stream of context results that will be emitted as 
	 * each action finishes (either with a result or with an error)
	 */
	public readonly results = this.mContextInputSubject.asObservable().pipe(
		concatMap((context: CommandContext<any>) => this.runCommand(context)),
		share()
	);

	/**
	 * Fallback command options that will be used when not
	 * supplied in one of the enqueueing methods.
	 */
	public readonly rootConfig: CommandConfig<any> = {
		// Any API call that hangs for 30 seconds should be killed by default
		timeoutMs: 30000,
		mocked: false
	};

	// Locks the "results" stream to an active state by ensuring at least one subscription exists.
	private readonly mActivatorSub = this.results.subscribe();

	/**
	 * Currently running command, if one exists.
	 * Returns null if no command is running.
	 */
	public get activeContext(): CommandContext<any> | null {
		return this.mActiveContextChangeSubject.value;
	}

	/**
	 * Returns true if this queue has been destroyed.
	 */
	public get isDestroyed(): boolean {
		return this.mContextInputSubject.closed;
	}

	/**
	 * Observable that will emit when abort() is called with either ALL or ACTIVE.
	 */
	public get activeCommandAbortSignal(): Observable<CommandAbortSignalType> {
		return this.getMaskedAbortSignal(CommandAbortSignalType.ALL, CommandAbortSignalType.ACTIVE);
	}

	/**
	 * Observable that will emit when abort() is called with either ALL or PENDING.
	 */
	public get pendingCommandAbortSignal(): Observable<CommandAbortSignalType> {
		return this.getMaskedAbortSignal(CommandAbortSignalType.ALL, CommandAbortSignalType.PENDING);
	}

	/**
	 * Used to kill queued and active command contexts.
	 * Run this with type ALL as a last stage cleanup option when resetting state.
	 */
	public abort(type: CommandAbortSignalType = CommandAbortSignalType.ALL): void {
		this.mAbortSignalSubject.next(type);
	}

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
		return rxPolyfillLastValueFrom(this.enqueue(action, config));
	}

	/**
	 * Special flavor of add() whose value is a pending observable.
	 * The inner observable will not be created until all preceding tasks have completed.
	 */
	public observe<T>(action: () => Observable<T>, config?: CommandConfig<Observable<T>>): Observable<T> {
		return this.enqueue(() => Promise.resolve(action()), config).pipe(
			switchMap((value: Observable<T>) => value)
		);
	}

	/**
	 * Tear-down option that cleans up the internal rxjs refs.
	 * CommandQueue references should be disposed of after this is called.
	 */
	public destroy(): void {

		if (this.isDestroyed) return;

		this.mActivatorSub.unsubscribe();

		destroyManySubjectsSafe([
			this.mContextInputSubject,
			this.mAbortSignalSubject,
			this.mActiveContextChangeSubject
		]);
	}

	/**
	 * Implementation detail for generating exposed abort signal streams.
	 */
	private getMaskedAbortSignal(...types: CommandAbortSignalType[]): Observable<CommandAbortSignalType> {
		return this.mAbortSignalSubject.asObservable().pipe(
			filter((v: CommandAbortSignalType) => types.includes(v))
		);
	}

	/**
	 * Internal implementation detail to notify a command context change and run the command.
	 */
	private async runCommand(context: CommandContext<any>): Promise<CommandContext<any>> {
		this.mActiveContextChangeSubject.next(context);
		const result = await context.run();
		this.mActiveContextChangeSubject.next(null);
		return result;
	}

	/**
	 * Internal queueing mechanism for commands.
	 * 
	 * This performs minimal unwrapping and may not emit as expected for the external api, 
	 * so we intentionally will not expose it directly.
	 */
	private enqueue<T>(action: CommandAction<T>, config?: Partial<CommandConfig<T>>): Observable<T> {

		const context = new CommandContext<T>(
			action,
			this.createConfig(config),
			castAbortSignalStream<T>(this.activeCommandAbortSignal)
		);

		const pendingContextAbortSignal = this.pendingCommandAbortSignal.pipe(
			takeUntil(this.activeContextChange.pipe(
				filter(activeCtx => (activeCtx === context))
			))
		);

		const outputStream = merge(
			this.results,
			castAbortSignalStream<CommandContext<any>>(pendingContextAbortSignal)
		).pipe(
			first((update: CommandContext<any>) => (update === context)),
			switchMap((update: CommandContext<T>) => update.unwrap())
		);

		return defer(() => {
			this.mContextInputSubject.next(context);
			return outputStream;
		});
	}
}