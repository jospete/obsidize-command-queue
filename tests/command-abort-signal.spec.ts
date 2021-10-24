import { Subject } from 'rxjs';

import {
	castAbortSignalStream,
	CommandAbortSignalError,
	CommandAbortSignalType,
	isCommandAbortSignalType,
	rxPolyfillLastValueFrom,
	throwAbortSignalError
} from '../src';

describe('CommandAbortSignal', () => {

	describe('throwAbortSignalError()', () => {

		it('interrupts the given stream with an error for first emitted signal type', async () => {

			const input = new Subject<CommandAbortSignalType>();
			const source = input.asObservable();
			const resultPromise = rxPolyfillLastValueFrom(source.pipe(throwAbortSignalError()));

			const signalType = CommandAbortSignalType.ALL;
			input.next(signalType);

			const result: any = await resultPromise.catch(e => e);

			expect(result).toBeDefined();
			expect(result instanceof CommandAbortSignalError).toBe(true);
			expect(isCommandAbortSignalType(result.abortSignalType)).toBe(true);
			expect(result.abortSignalType).toBe(signalType);
		});
	});

	describe('castAbortSignalStream()', () => {

		it('converts the input stream to one that will throw an error when the input emits', async () => {

			const input = new Subject<CommandAbortSignalType>();
			const source = castAbortSignalStream<any>(input);
			const resultPromise = rxPolyfillLastValueFrom(source);

			const signalType = CommandAbortSignalType.ALL;
			input.next(signalType);

			const result = await resultPromise.catch(e => e);
			expect(result.abortSignalType).toBe(signalType);
		});
	});
});