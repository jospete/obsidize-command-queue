import { CommandContext } from '../src';

describe('CommandContext', () => {

	describe('setResult()', () => {

		it('configures the context to be in a non-error result state', () => {
			const context = new CommandContext<any>(() => Promise.resolve(), { timeoutMs: 5000 });
			expect(context.result).not.toBeDefined();
			expect(context.setResult(5)).toBe(context);
			expect(context.result).toBe(5);
			expect(context.hasError).toBe(false);
		});
	});

	describe('setError()', () => {

		it('configures the context to be in an error state', () => {
			const context = new CommandContext<any>(() => Promise.resolve(), { timeoutMs: 5000 });
			expect(context.error).not.toBeDefined();
			expect(context.setError(5)).toBe(context);
			expect(context.error).toBe(5);
			expect(context.hasError).toBe(true);
		});
	});

	describe('unwrap()', () => {

		it('returns an observable of one element when in a non-error state', async () => {

			const context = new CommandContext<any>(() => Promise.resolve(), { timeoutMs: 5000 });
			const result = await context.unwrap();
			expect(result).not.toBeDefined();

			context.setResult(42);
			const result2 = await context.unwrap();
			expect(result2).toBe(42);
		});


		it('returns an error observable when in an error state', async () => {

			const context = new CommandContext<any>(() => Promise.resolve(), { timeoutMs: 5000 });
			context.setError('Does not exist');

			const error = await context.unwrap().catch(e => e);
			expect(error).toBe('Does not exist');
		});
	});

	describe('run()', () => {

		it('emits the seed value when mocked', async () => {

			const failureAction = jasmine.createSpy('failureAction').and.callFake(() => Promise.reject('should not happen'));

			const context = new CommandContext<any>(failureAction, {
				timeoutMs: 5000,
				mocked: true,
				seedValue: 1234
			});

			const result: CommandContext<any> = await context.run();

			expect(result).toBe(context);
			expect(result.result).toBe(context.config.seedValue);
			expect(failureAction).not.toHaveBeenCalled();
		});

		it('configures a result value when in a standard (non-mocked) state and the action succeeds', async () => {

			const testValue = { testObj: true };
			const action = jasmine.createSpy('contextAction').and.callFake(() => Promise.resolve(testValue));
			const context = new CommandContext<any>(action, { timeoutMs: 5000 });
			const result: CommandContext<any> = await context.run();

			expect(result.result).toBe(testValue);
			expect(result.hasError).toBe(false);
		});

		it('configures an error value when in a standard (non-mocked) state and the action fails', async () => {

			const testValue = { error: true, message: 'this should explode' };
			const action = jasmine.createSpy('contextAction').and.callFake(() => Promise.reject(testValue));
			const context = new CommandContext<any>(action, { timeoutMs: 5000 });
			const result: CommandContext<any> = await context.run();

			expect(result.error).toBe(testValue);
			expect(result.hasError).toBe(true);
		});

		it('configures an error value when the given input action is malformed', async () => {

			const context = new CommandContext<any>(null, { timeoutMs: 5000 });
			const result: CommandContext<any> = await context.run();

			expect(result.error).toBeDefined();
			expect(result.hasError).toBe(true);
		});
	});
});