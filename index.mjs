import * as ynab from 'ynab';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'eu-north-1' });
const secretResponse = await client.send(
  new GetSecretValueCommand({
    SecretId: 'YNAB',
  })
);
const YNAB_TOKEN = JSON.parse(secretResponse.SecretString).YNAB_TOKEN;

const ynabAPI = new ynab.API(YNAB_TOKEN);

const monoAllowedAccountIds = [
  'm2TMV6h71fJEl3r7kaAKjg',
  'KL98vkSog0Fye1lVVtn1ag',
];

export const handler = async (event) => {
  if (event.requestContext.http.method === 'GET') {
    console.log('Webhook registered');
    return {
      statusCode: 200,
    };
  }

  if (event.requestContext.http.method === 'POST') {
    console.log('Webhook received');

    const msg = JSON.parse(event.body);

    if (
      !(
        msg.type === 'StatementItem' &&
        monoAllowedAccountIds.includes(msg.data.account) &&
        msg.data.statementItem.amount < 0
      )
    ) {
      return {
        statusCode: 200,
      };
    }

    const paymentDetails = msg.data.statementItem;
    const payee = paymentDetails.description;
    const amount = paymentDetails.amount * 10;

    const transactionResp = await ynabAPI.transactions.createTransaction(
      process.env.YNAB_BUDGET_ID,
      {
        transaction: {
          account_id: process.env.YNAB_ACCOUNT_ID,
          date: ynab.utils.getCurrentDateInISOFormat(),
          payee_name: payee,
          amount,
          cleared: 'cleared',
        },
      }
    );

    console.log('Transaction created', transactionResp.data.transaction);

    return {
      statusCode: 200,
    };
  }
};
