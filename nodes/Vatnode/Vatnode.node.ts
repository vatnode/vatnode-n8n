import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IDataObject,
	type IHttpRequestOptions,
	type JsonObject,
} from 'n8n-workflow';

import { COUNTRIES, COUNTRY_BY_CODE } from './countries.generated';

const DEFAULT_BASE_URL = 'https://api.vatnode.dev';

function normalizeVatId(vatId: string): string {
	return vatId.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export class Vatnode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'vatnode',
		name: 'vatnode',
		icon: { light: 'file:vatnode.svg', dark: 'file:vatnode.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Validate EU VAT numbers against VIES and look up EU VAT rates',
		defaults: {
			name: 'vatnode',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'vatnodeApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['vat'],
						operation: ['validate'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'VAT Number',
						value: 'vat',
					},
					{
						name: 'VAT Rate',
						value: 'rate',
					},
				],
				default: 'vat',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['vat'],
					},
				},
				options: [
					{
						name: 'Validate',
						value: 'validate',
						description:
							'Verify a VAT number against the official EU VIES register. Requires an API key and spends one request from your quota.',
						action: 'Validate a VAT number',
					},
					{
						name: 'Check Format',
						value: 'checkFormat',
						description:
							'Check a VAT number against its country pattern. Runs offline: no API key, no network call, no quota.',
						action: 'Check the format of a VAT number',
					},
				],
				default: 'validate',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['rate'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get the VAT rates for one country',
						action: 'Get the VAT rates for a country',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get the VAT rates for every covered country',
						action: 'Get the VAT rates for many countries',
					},
				],
				default: 'get',
			},
			{
				displayName: 'VAT Number',
				name: 'vatId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'DE123456789',
				description: 'VAT number with its country prefix. Spaces and dashes are ignored.',
				displayOptions: {
					show: {
						resource: ['vat'],
					},
				},
			},
			{
				displayName: 'Country Code',
				name: 'countryCode',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'DE',
				description:
					'ISO 3166-1 alpha-2 country code, for example DE or FR. EL and GR both resolve to Greece.',
				displayOptions: {
					show: {
						resource: ['rate'],
						operation: ['get'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: unknown;

				if (resource === 'vat' && operation === 'checkFormat') {
					result = checkFormat(this.getNodeParameter('vatId', i) as string);
				} else if (resource === 'vat' && operation === 'validate') {
					const vatId = normalizeVatId(this.getNodeParameter('vatId', i) as string);
					if (vatId === '') {
						throw new NodeOperationError(this.getNode(), 'The VAT number is empty', {
							itemIndex: i,
						});
					}
					const options: IHttpRequestOptions = {
						method: 'GET',
						url: `${DEFAULT_BASE_URL}/v1/vat/${encodeURIComponent(vatId)}`,
						json: true,
					};
					result = await this.helpers.httpRequestWithAuthentication.call(this, 'vatnodeApi', options);
				} else if (resource === 'rate' && operation === 'get') {
					const input = (this.getNodeParameter('countryCode', i) as string).trim().toUpperCase();
					// VIES writes Greece as EL, the rate endpoint keys it as GR.
					const countryCode = input === 'EL' ? 'GR' : input;
					result = await this.helpers.httpRequest({
						method: 'GET',
						url: `${DEFAULT_BASE_URL}/v1/rates/${encodeURIComponent(countryCode)}`,
						json: true,
					});
				} else if (resource === 'rate' && operation === 'getAll') {
					result = await this.helpers.httpRequest({
						method: 'GET',
						url: `${DEFAULT_BASE_URL}/v1/rates`,
						json: true,
					});
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unknown operation "${operation}" for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				// /v1/rates answers with a { rates: [...] } envelope; everything else
				// is a single object. Either way each entry becomes one n8n item.
				const entries = Array.isArray((result as { rates?: unknown[] })?.rates)
					? ((result as { rates: IDataObject[] }).rates)
					: [result as IDataObject];

				for (const entry of entries) {
					returnData.push({ json: entry, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

/**
 * Offline syntactic check. A valid format says nothing about whether the VAT
 * number exists — that is what the Validate operation is for.
 */
function checkFormat(input: string): IDataObject {
	const normalized = normalizeVatId(input);
	const countryCode = normalized.slice(0, 2);
	const country = COUNTRY_BY_CODE[countryCode];
	const validFormat = Boolean(country?.pattern) && new RegExp(country!.pattern!).test(normalized);

	return {
		input,
		normalized,
		countryCode: country ? countryCode : null,
		countryName: country?.name ?? null,
		validFormat,
		viesEligible: country?.viesEligible ?? false,
		error: validFormat
			? null
			: country
				? `${normalized} does not match the VAT number format for ${country.name}.`
				: `Unknown country prefix "${countryCode}". Supported prefixes: ${COUNTRIES.map((c) => c.code).join(', ')}.`,
	};
}
