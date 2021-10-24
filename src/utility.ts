import { Observable } from 'rxjs';

/**
 * Polyfill for old (< rxjs 7) throwError behavior, since rxjs 7+ requires a function instead.
 */
export function rxPollyfillThrowError<T>(error: any): Observable<T> {
	return new Observable<T>(subscriber => subscriber.error(error));
}

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