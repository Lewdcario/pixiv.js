declare module 'pixiv.js' {
	export class Pixiv {
		constructor(username: string, password: string, clientID: string, clientSecret: string): void;
		public username: string;
		public password: string;
		public clientID: string;
		public clientSecret: string;

		public illustDetail(id: string|number, options?: object): Promise<object>
		public getImageByKeyword(keyword: string): Promise<string>
		public downloadIllustFromURL(url: string): Promise<Buffer>

		private _accessToken?: string;
	}
}
