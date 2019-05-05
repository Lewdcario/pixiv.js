const fetch = require('node-fetch');
const { stringify } = require('querystring');

const BASE_URL = 'https://app-api.pixiv.net';
const headers = {
	'accept-type': 'application/json',
	'content-type': 'application/x-www-form-urlencoded'
};

const { username, password } = require('./config');

/**
 * Pixiv class
 */
class Pixiv {
	/**
	 * @param {string} username Pixiv account username
	 * @param {string} password Pixiv account password
	 * @param {string} clientID Client ID
	 * @param {string} clientSecret Client Secret
	 */
	constructor(username, password, clientID, clientSecret) {
		/**
		 * Pixiv account username
		 * @type {string}
		 */
		this.username = username;

		/**
		 * Pixiv account password
		 * @type {string}
		 */
		this.password = password;

		/**
		 * Client ID
		 * @type {string}
		 */
		this.clientID = clientID;

		/**
		 * Client Secret
		 * @type {string}
		 */
		this.clientSecret = clientSecret;

		/**
		 * API access token
		 * @type {?string}
		 */
		this.accessToken = null;

		if (!this.username || !this.password) {
			throw Error('Username and password required');
		}

		if (!this.clientID || !this.clientSecret) {
			throw Error('ClientID and clientSecret required');
		}
	}

	/**
	 * Returns details about a provided image ID
	 * @param {string|number} id The ID to search by
	 * @param {object={}} options The options to use
	 * @returns {Promise<object>}
	 */
	illustDetail(id, options = {}) {
		return this._request('/v1/illust/detail', 'GET', { params: Object.assign(options, { illust_id: id }) });
	}

	/**
	 * Searches for an image by a specified keyword
	 * @param {string} keyword The keyword to search for
	 * @returns {Promise<string>}
	 */
	getImageByKeyword(keyword) {
		if (typeof keyword === 'undefined') return Promise.reject('Keyword required');
		return this._searchIMG(keyword).then(images => images.illusts[0].image_urls.large);
	}

	/**
	 * Gets a buffer from a pixiv illustration
	 * @param {string} url The pixiv illustration URL to download
	 * @returns {Promise<Buffer>}
	 */
	downloadFromIllustURL(url) {
		// TODO: proper regex
		if (typeof url === 'undefined') return Promise.reject('URL required');
		if (!url.includes('illust_id')) throw Error('URL must be a pixiv image URL.');
		return this.illustDetail(url.match(/illust_id=([0-9]+)/)[1])
			.then(pixivImageDetails => this._toBuffer(pixivImageDetails.illust.image_urls.large))
			.catch(e => {
				// Deleted work :(
				if (e.toString().includes('該当作品は削除されたか、存在しない作品IDです')) return null;
				throw e;
			});
	}

	_searchIMG(word, options = {}) {
		const data = stringify(Object.assign(options, {
			word,
			search_target: 'partial_match_for_tags',
			sort: 'date_desc'
		}));
		return this._request('/v1/manga/recommended', 'GET', { params: data });
	}

	_toBuffer(url) {
		return fetch(url, { headers: { 'Referer': 'http://www.pixiv.net/' } }).then(r => r.buffer());
	}

	async _authenticate() {
		const data = {
			client_id: this.clientID,
			client_secret: this.clientSecret,
			get_secure_url: 1,
			username,
			password,
			grant_type: 'password'
		};

		const body = await fetch('https://oauth.secure.pixiv.net/auth/token', {
			body: stringify(data),
			method: 'POST',
			headers
		}).then(r => r.json());

		if (body.has_error) throw Error(body.errors.system.message);
		this.accessToken = body.response.access_token;
	}

	async _request(path, method, data) {
		if (!this.accessToken) await this._authenticate();

		const url = new URL(`${BASE_URL}${path}`);
		if (data.params) {
			Object.keys(data.params).forEach(key => url.searchParams.append(key, data.params[key]))
		}

		const res = await fetch(url, {
			method,
			body: data.options && stringify(data.options),
			headers: Object.assign(headers, { 'authorization': `Bearer ${this.accessToken}` })
		});

		const contentType = res.headers.get('content-type');
		if (contentType && contentType.indexOf('application/json') !== -1) {
			const body = await res.json();
			if (body.has_error) throw Error(body.errors.system.message);
			if (body.error) throw Error(body.error.user_message);
			return body;
		}

		return res.buffer();
	}
};

module.exports = Pixiv;
