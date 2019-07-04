import fetch from 'node-fetch';
import * as querystring from 'querystring';

export type ImageUrls = {
	px_50x50?: string;
	px_128x128?: string;
	px_480mw?: string;
	small?: string;
	medium?: string;
	large?: string;
	square_small?: string;
	square_medium?: string;
	square_large?: string;
};

export type Tag = {
	name: string;
	translated_name?: string;
};

export type MetaPage = {
	image_urls: ImageUrls;
};

export type User = {
	id: number;
	account: string;
	name: string;
	is_followed: boolean;
	is_following?: boolean;
	is_follower?: boolean;
	is_friend?: boolean;
	is_premium?: boolean;
	profile_image_urls: ImageUrls;
	stats?: any;
	profile?: any;
};

export type PixivIllustration = {
	id: number;
	title: string;
	caption: string;
	restrict: number;
	tags: Tag[];
	tools: string[];
	image_urls: ImageUrls;
	width: number;
	height: number;
	stats?: any;
	publicity: 0;
	age_limit: string;
	created_time: string;
	reuploaded_time: string;
	user: User;
	is_manga: boolean;
	is_liked: boolean;
	favorite_id: number;
	page_count: number;
	book_style: 'right_to_left' | 'left_to_right';
	type: string;
	series?: {
		id: number;
		title: string;
	};
	metadata?: any;
	meta_pages: MetaPage[];
	meta_single_page: {
		original_image_url: string;
	};
	content_type?: any;
	is_bookmarked: boolean;
	total_view: number;
	total_bookmarks: number;
	visible: boolean;
	total_comments: number;
	is_muted: boolean;
	x_restrict: number;
	sanity_level: number;
};

export type PixivIllustrationBody = {
	illust: PixivIllustration;
};

export type PixivIllustrationList = {
	illusts: PixivIllustration[];
	ranking_illusts: any[];
	next_url: string;
};

const BASE_URL = 'https://app-api.pixiv.net';
const headers = {
	'accept-type': 'application/json',
	'content-type': 'application/x-www-form-urlencoded',
};

/**
 * Pixiv class
 */
class Pixiv {
	public username: string;
	public password: string;
	public clientID?: string;
	public clientSecret?: string;
	private _accessToken?: string;

	public constructor(username: string, password: string, clientID?: string, clientSecret?: string) {
		this.username = username;
		this.password = password;
		this.clientID = clientID;
		this.clientSecret = clientSecret;
		this._accessToken = undefined;

		if (!this.username || !this.password) {
			throw Error('Username and password required');
		}

		if (!this.clientID || !this.clientSecret) {
			throw Error('ClientID and clientSecret required');
		}
	}

	public illustDetail(id: string | number, options: any = {}): Promise<PixivIllustrationBody> {
		return this._request('/v1/illust/detail', 'GET', { params: Object.assign(options, { illust_id: id }) });
	}

	public getIllustsByKeyword(keyword: string): Promise<PixivIllustrationList> {
		if (typeof keyword === 'undefined') return Promise.reject(new Error('Keyword required'));
		return this._searchIMG(keyword);
	}

	public getImageByKeyword(keyword: string): Promise<string | null> {
		if (typeof keyword === 'undefined') return Promise.reject(new Error('Keyword required'));
		return this._searchIMG(keyword).then(
			(images: PixivIllustrationList) => images.illusts[0].image_urls.large || null
		);
	}

	public downloadFromIllustURL(url: string): Promise<Buffer | null> {
		// TODO: proper regex
		if (typeof url === 'undefined') return Promise.reject(new Error('URL required'));
		if (!url.includes('illust_id')) return Promise.reject(new Error('URL must be a pixiv image URL.'));
		return this.illustDetail((url.match(/illust_id=([0-9]+)/) || [])[1])
			.then((pixivImageDetails) => {
				if (pixivImageDetails.illust.image_urls.large) {
					return this._toBuffer(pixivImageDetails.illust.image_urls.large);
				}
				// Because TS doesn't know what "return null" means inside a promise
				return Promise.resolve(null);
			})
			.catch((e: Error) => {
				// Deleted work :(
				if (e.toString().includes('該当作品は削除されたか、存在しない作品IDです')) return null;
				throw e;
			});
	}

	private _searchIMG(word: string, options = {}) {
		const data = querystring.stringify(
			Object.assign(options, {
				search_target: 'partial_match_for_tags',
				sort: 'date_desc',
				word
			}),
		);
		return this._request('/v1/manga/recommended', 'GET', { params: data });
	}

	private _toBuffer(url: string): Promise<Buffer> {
		return fetch(url, { headers: { Referer: 'http://www.pixiv.net/' } }).then((r) => r.buffer());
	}

	private async _authenticate(): Promise<void> {
		const data = {
			client_id: this.clientID,
			client_secret: this.clientSecret,
			get_secure_url: 1,
			grant_type: 'password',
			password: this.password,
			username: this.username
		};

		const body = await fetch('https://oauth.secure.pixiv.net/auth/token', {
			body: querystring.stringify(data),
			headers,
			method: 'POST'
		}).then((r) => r.json());

		if (body.has_error) throw Error(body.errors.system.message);
		this._accessToken = body.response.access_token;
	}

	private async _request(path: string, method?: string, data?: { params?: any; options?: any }): Promise<any> {
		if (!this._accessToken) await this._authenticate();

		const url = new URL(`${BASE_URL}${path}`);
		if (data && data.params) {
			Object.keys(data.params).forEach((key) => url.searchParams.append(key, data.params[key]));
		}

		const res = await fetch(url as any, {
			body: data && data.options && querystring.stringify(data.options),
			headers: Object.assign(headers, { authorization: `Bearer ${this._accessToken}` }),
			method
		});

		const contentType = res.headers.get('content-type');
		if (contentType && contentType.indexOf('application/json') !== -1) {
			const body = await res.json();
			if (body.has_error) throw Error(body.errors.system.message);
			if (body.error) {
				// Retry for new token
				if (body.error.message.includes('OAuth')) {
					return this._authenticate().then(() => this._request(path, method, data));
				}
				else throw Error(body.error.user_message || body.error.message);
			}
			return body;
		}

		return res.buffer();
	}
}

export default Pixiv;
