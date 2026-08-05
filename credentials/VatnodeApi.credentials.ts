import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class VatnodeApi implements ICredentialType {
	name = 'vatnodeApi';

	displayName = 'Vatnode API';

	documentationUrl = 'https://vatnode.dev/docs';

	icon: Icon = { light: 'file:vatnode.svg', dark: 'file:vatnode.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'API key from your vatnode dashboard. The free plan includes a monthly request quota.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// XX0000001 is the reserved test VAT number: it never reaches VIES and never
	// spends quota, so the test only proves that the key is accepted.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.vatnode.dev',
			url: '/v1/vat/XX0000001',
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 401,
					message: 'The vatnode API key is invalid',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 403,
					message: 'This vatnode API key is not allowed to validate VAT numbers',
				},
			},
		],
	};
}
