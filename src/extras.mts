export function isLocal(incoming: string | URL | Request): boolean {
	let incomingUrl: URL;
	// @ts-ignore
	if (incoming instanceof Request) {
		incomingUrl = new URL(incoming.headers.get('origin') ?? incoming.url);
	} else {
		incomingUrl = new URL(incoming);
	}

	if (incomingUrl.hostname === 'localhost' || incomingUrl.hostname === '127.0.0.1') {
		return true;
	}

	const parts = incomingUrl.hostname.split('.').map((part) => parseInt(part, 10));

	if (parts.length !== 4) {
		// Not a valid IPv4 address
		return false;
	}

	if (parts[0] === 10) {
		// Class A private IP
		return true;
	}

	if (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) {
		// Class B private IP
		return true;
	}

	if (parts[0] === 192 && parts[1] === 168) {
		// Class C private IP
		return true;
	}

	return false;
}

export function runningLocally(incomingRequest: Request): boolean {
	return isLocal(new URL(incomingRequest.headers.get('Origin') ?? `https://${incomingRequest.headers.get('Host')}`));
}
