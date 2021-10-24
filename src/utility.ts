import { Observable, Subject } from 'rxjs';

/**
 * Polyfill for old (< rxjs 7) throwError behavior, since rxjs 7+ requires a function instead.
 */
export function rxPolyfillThrowError<T>(error: any): Observable<T> {
	return new Observable<T>(subscriber => subscriber.error(error));
}

/**
 * Polyfill for new rxjs lastValueFrom() function since rxjs versions < 7 do not export this.
 */
export function rxPolyfillLastValueFrom<T>(source: Observable<T>): Promise<T> {

	return new Promise<T>((resolve, reject) => {

		let lastValue: T;

		source.subscribe({
			next: (v: T) => (lastValue = v),
			error: reject,
			complete: () => resolve(lastValue)
		});
	});
}

/**
 * Teardown utility for subject instances.
 */
export function destroySubjectSafe(subject: Subject<any>): void {
	try {
		subject.complete();
		subject.unsubscribe();
	} catch { }
}

/**
 * Spread utility to reduce multi-destroy boilerplate.
 */
export function destroyManySubjectsSafe(subjects: Subject<any>[]): void {
	Array.from(subjects).forEach(destroySubjectSafe);
}