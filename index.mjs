import * as ynab from 'ynab';
const ynabAPI = new ynab.API(process.env.YNAB_TOKEN);

export const handler = async (event, context) => {
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
        msg.data.account === process.env.MONO_ACCOUNT_ID &&
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
