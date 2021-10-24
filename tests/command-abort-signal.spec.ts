import { Subject } from 'rxjs';

import { castAbortSignalStream, CommandAbortSignalType, isCommandAbortSignalType, rxPollyfillLastValueFrom } from '../src';

describe('CommandAbortSignal', () => {

	describe('castAbortSignalStream', () => {

		it('converts the input stream to one that will throw an error when the input emits', async () => {

			const input = new Subject<CommandAbortSignalType>();
			const source = castAbortSignalStream<any>(input);
			const resultPromise = rxPollyfillLastValueFrom(source);

			input.next(CommandAbortSignalType.ALL);

			const result = await resultPromise.catch(e => e);

			expect(result).toBeDefined();
			expect(isCommandAbortSignalType(result.abortSignalType)).toBe(true);
			expect(result.abortSignalType).toBe(CommandAbortSignalType.ALL);
		});
	});
});