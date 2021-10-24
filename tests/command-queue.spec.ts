import { CommandAction, CommandQueue } from '../src';
import { sleep } from './test-utility';

describe('CommandQueue', () => {

	it('executes tasks on a first come, first serve basis', async () => {

		const sleepTimes: number[] = [100, 10, 50];
		const tasks: CommandAction<number>[] = sleepTimes.map(v => (() => sleep(v)));
		const taskSpies = sleepTimes.map((_, i) => jasmine.createSpy('taskSpy' + i));

		const queue = new CommandQueue();
		const promises = tasks.map((action, i) => queue.add(action).then(taskSpies[i]));

		await Promise.all(promises);

		for (let i = 0; i < taskSpies.length - 1; i++) {
			expect(taskSpies[i]).toHaveBeenCalledBefore(taskSpies[i + 1]);
		}
	});
});