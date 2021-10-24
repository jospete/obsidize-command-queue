import { defer } from 'rxjs';
import { rxPollyfillLastValueFrom } from '../src';
import { sleep } from './test-utility';

describe('utility', () => {

	describe('lastValueFrom()', () => {

		it('acts as a shim of the rxjs lastValueFrom() function for older rxjs installs', async () => {
			const sleepTime = 54;
			const result = await rxPollyfillLastValueFrom(defer(() => sleep(sleepTime)));
			expect(result).toBe(sleepTime);
		});
	});
});