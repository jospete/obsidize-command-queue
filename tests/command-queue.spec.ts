import { of } from 'rxjs';

import { CommandAbortSignalType, CommandAction, CommandQueue, rxPolyfillLastValueFrom } from '../src';
import { sleep } from './test-utility';

describe('CommandQueue', () => {

	it('executes tasks on a first come, first serve basis', async () => {

		const sleepTimes: number[] = [100, 10, 50];
		const tasks: CommandAction<number>[] = sleepTimes.map(v => (() => sleep(v)));
		const taskSpies = sleepTimes.map((_, i) => jasmine.createSpy('taskSpy' + i).and.callFake(() => undefined));

		const queue = new CommandQueue();
		const promises = tasks.map((action, i) => queue.add(action).then(taskSpies[i]));

		await Promise.all(promises);

		for (let i = 0; i < taskSpies.length - 1; i++) {
			expect(taskSpies[i]).toHaveBeenCalledBefore(taskSpies[i + 1]);
		}
	});

	it('can be destroyed', async () => {

		const queue = new CommandQueue();

		expect(queue.isDestroyed).toBe(false);
		expect(() => queue.destroy()).not.toThrowError();
		expect(queue.isDestroyed).toBe(true);
		expect(() => queue.destroy()).not.toThrowError();

		try {
			await queue.add(() => Promise.resolve());

		} catch (e) {
			expect(e).toBeDefined();
		}
	});

	describe('observe()', () => {

		it('emits the inner wrapped observable', async () => {

			const queue = new CommandQueue();
			const output = of(50);
			const result = await rxPolyfillLastValueFrom(queue.observe(() => output));

			expect(result).toBe(50);
		});
	});

	describe('abort()', () => {

		it('kills active processes when the ACTIVE type is used', async () => {

			const queue = new CommandQueue();
			const reallyLongActionPromise = queue.add(() => sleep(500000));
			const catchSpy = jasmine.createSpy('catchSpy').and.callFake(e => e);

			queue.abort(CommandAbortSignalType.ACTIVE);

			const error = await reallyLongActionPromise.catch(catchSpy);
			expect(catchSpy).toHaveBeenCalledTimes(1);
			expect(error).toBeDefined();
			expect(error.abortSignalType).toBe(CommandAbortSignalType.ACTIVE);
		});

		it('kills active processes when the ALL type is used', async () => {

			const queue = new CommandQueue();
			const reallyLongActionPromise = queue.add(() => sleep(500000));

			queue.abort();

			const error = await reallyLongActionPromise.catch(e => e);
			expect(error.abortSignalType).toBe(CommandAbortSignalType.ALL);
		});

		it('does NOT kill active processes when the PENDING type is used', async () => {

			const queue = new CommandQueue();
			const resultPromise = queue.add(() => sleep(46));

			// Need to wait a bit for the context to become "active"
			await sleep(30);
			queue.abort(CommandAbortSignalType.PENDING);

			const result = await resultPromise;
			expect(result).toBe(46);
		});

		it('kills pending processes when the PENDING type is used', async () => {

			const queue = new CommandQueue();
			const catchSpy = jasmine.createSpy('catchSpy').and.callFake(e => e);
			const longRunningProcessSpy = jasmine.createSpy('longRunningProcess').and.callFake(e => e);

			queue.add(() => sleep(500000)).then(longRunningProcessSpy);

			const shortActionPromise = queue.add(() => sleep(123)).catch(catchSpy);

			queue.abort(CommandAbortSignalType.PENDING);

			const error = await shortActionPromise;
			expect(longRunningProcessSpy).not.toHaveBeenCalled();
			expect(catchSpy).toHaveBeenCalledTimes(1);
			expect(error).toBeDefined();
			expect(error.abortSignalType).toBe(CommandAbortSignalType.PENDING);
		});

		it('kills pending processes when the ALL type is used', async () => {

			const queue = new CommandQueue();
			const longRunningProcessSpy = jasmine.createSpy('longRunningProcess').and.callFake(e => e);

			queue.add(() => sleep(500000)).then(longRunningProcessSpy);

			const shortActionPromise = queue.add(() => sleep(123)).catch(e => e);

			queue.abort();

			const error = await shortActionPromise;
			expect(longRunningProcessSpy).not.toHaveBeenCalled();
			expect(error.abortSignalType).toBe(CommandAbortSignalType.ALL);
		});

		it('does NOT kill pending processes when the ACTIVE type is used', async () => {

			const queue = new CommandQueue();
			queue.add(() => sleep(500000)).catch(e => e);

			const shortActionPromise = queue.add(() => sleep(123));

			expect(queue.activeContext).not.toBe(null);
			queue.abort(CommandAbortSignalType.ACTIVE);

			const result = await shortActionPromise;
			expect(result).toBe(123);
		});
	});
});