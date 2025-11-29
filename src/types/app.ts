export type Props = {
	accessToken: string;
	refreshToken: string;
	state: string;
	userName: string;
	clientId: string;
	isAuthenticated: boolean;
	isOAuth: boolean;
};

// Define custom state for storing previous measurements
export type State = {
	lastMeasurementId?: string;
	measurements: Record<string, any>;
	storage?: DurableObjectStorage;
	oAuth: any;
};
