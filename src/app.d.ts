// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** Stack of group button ids the home screen has drilled into. */
			groupPath?: string[];
		}
		// interface Platform {}
	}
}

export {};
