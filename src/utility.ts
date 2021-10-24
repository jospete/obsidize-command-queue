import { Observable } from 'rxjs';

/**
 * Polyfill for new rxjs lastValueFrom() function since rxjs versions < 7 do not export this.
 */
export function rxPollyfillLastValueFrom<T>(source: Observable<T>): Promise<T> {

	return new Promise<T>((resolve, reject) => {

		let lastValue: T;

		source.subscribe({
			next: (v: T) => (lastValue = v),
			error: reject,
			complete: () => resolve(lastValue)
		});
	});
}