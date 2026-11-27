export type Props = {
	accessToken: string;
	refreshToken: string;
	state: string;
	clientId: string;
	isAuthenticated: boolean;
	isOAuth: boolean;
};

// Define custom state for storing previous measurements
export type State = {
	measurements: Record<string, any>;
	storage?: DurableObjectStorage;
	oAuth: any;
};
