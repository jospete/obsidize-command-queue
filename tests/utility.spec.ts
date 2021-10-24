import { defer } from 'rxjs';

import { rxPolyfillLastValueFrom, rxPolyfillThrowError } from '../src';
import { sleep } from './test-utility';

describe('utility', () => {

	describe('rxPolyfillLastValueFrom()', () => {

		it('acts as a shim of the rxjs lastValueFrom() function for older rxjs installs', async () => {
			const sleepTime = 54;
			const result = await rxPolyfillLastValueFrom(defer(() => sleep(sleepTime)));
			expect(result).toBe(sleepTime);
		});
	});

	describe('rxPolyfillThrowError()', () => {

		it('acts as a shim of the rxjs throwError() function for newer rxjs installs', async () => {
			const result = await rxPolyfillLastValueFrom(rxPolyfillThrowError(5)).catch(e => e);
			expect(result).toBe(5);
		});
	});
});