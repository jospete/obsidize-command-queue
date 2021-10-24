import { defer, ObservableInput, of } from 'rxjs';
import { map, catchError, timeout, first } from 'rxjs/operators';
import { rxPollyfillLastValueFrom } from './utility';

/**
 * Alias for an action to be executed via the metadata run function.
 */
export type CommandAction<T> = () => ObservableInput<T>;

/**
 * Configuration options that dictate how a command should be run.
 * Can also contain custom options for a command, like a tag.
 */
export interface CommandConfig<T> {
	timeoutMs: number;
	seedValue?: T;
	mocked?: boolean;
	tag?: string;
	[key: string]: any;
}

/**
 * Boilerplate interface for a CommandMetadata object.
 * Used to define the bare-minimum required to make a metadata object function correctly.
 */
export interface CommandContextLike<T> {
	readonly config: CommandConfig<T>;
	readonly action: CommandAction<T>;
	result?: T;
	error?: any;
	hasError?: boolean;
}

/**
 * Container for all the data need to execute a pending action,
 * and yield a result or error at a later time.
 */
export class CommandContext<T> implements CommandContextLike<T> {

	public result?: T | undefined;
	public error?: any | undefined;
	public hasError?: boolean | undefined;

	constructor(
		public readonly action: CommandAction<T>,
		public readonly config: CommandConfig<T>
	) {
	}

	/**
	 * Convenience to change the state of this metadata to a non-error result.
	 */
	public setResult(value: T): this {
		this.result = value;
		this.error = undefined;
		this.hasError = false;
		return this;
	}

	/**
	 * Convenience to change the state of this metadata to an error.
	 */
	public setError(error: any): this {
		this.result = undefined;
		this.error = error;
		this.hasError = true;
		return this;
	}

	/**
	 * Unboxes the current state of this command as
	 * either an emission of the run result, or
	 * an exception stream for any caught errors.
	 */
	public unwrap(): Promise<T> {
		return this.hasError
			? Promise.reject(this.error)
			: Promise.resolve(this.result!);
	}

	/**
	 * Stands up an observable that will execute this command's action,
	 * and save the result (or error) to be unwrapped later.
	 * 
	 * Emits immediately with the seed value when mocked is set to true.
	 */
	public run(): Promise<CommandContext<T>> {

		if (this.config.mocked) {
			return Promise.resolve(this.setResult(this.config.seedValue!));
		}

		const runProcess = defer(() => this.action()).pipe(
			first(),
			timeout(this.config.timeoutMs),
			map((result: T) => this.setResult(result)),
			catchError(error => of(this.setError(error)))
		);

		return rxPollyfillLastValueFrom(runProcess);
	}
}