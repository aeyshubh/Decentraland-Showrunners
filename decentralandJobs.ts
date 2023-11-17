// Do Scheduling
// https://github.com/node-schedule/node-schedule
// *    *    *    *    *    *
// ┬    ┬    ┬    ┬    ┬    ┬
// │    │    │    │    │    │
// │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
// │    │    │    │    └───── month (1 - 12)
// │    │    │    └────────── day of month (1 - 31)
// │    │    └─────────────── hour (0 - 23)
// │    └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)
// Execute a cron job every 5 Minutes = */5 * * * *
// Starts from seconds = * * * * * *

import config from '../../config';
import logger from '../../loaders/logger';
import { Container } from 'typedi';
import schedule from 'node-schedule';
import DecentralandChannel from './decentralandChannel';
import DecentralandPolygonChannel from './decentralandPolygonChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));

  const twentyMinuteRule = new schedule.RecurrenceRule();
  twentyMinuteRule.minute = new schedule.Range(0, 59, 10);

  logger.info(`     🛵 Scheduling Showrunner - Decentraland Eth Channel[20 Minutes] [${new Date(Date.now())}]`);
  schedule.scheduleJob({ start: startTime, rule: twentyMinuteRule }, async function () {
    const channel = await Container.get(DecentralandChannel);

    const taskName = `${channel.cSettings.name} event checks and sendMessageToContract()`;
    try {
      await channel.BidAccecpted(false);
      await channel.bidCreated(false);
      await channel.orderExecutedSuccessfully(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.info(`❌ Cron Task Failed -- ${taskName}`);
      logger.info(`Error Object: %o`, err);
    }
  });

  logger.info(`     🛵 Scheduling Showrunner - Decentraland Polygon Channel[20 Minutes] [${new Date(Date.now())}]`);
  schedule.scheduleJob({ start: startTime, rule: twentyMinuteRule }, async function () {
    const channel = await Container.get(DecentralandPolygonChannel);
    const taskName = `${channel.cSettings.name} event checks and sendMessageToContract()`;
    try {
      await channel.polygonBidAccepted(false);
      await channel.polygonBidCreated(false);
      await channel.polygonOrderSuccessfull(false);
      await channel.polygonOrderSuccessfullV2(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.info(`❌ Cron Task Failed -- ${taskName}`);
      logger.info(`Error Object: %o`, err);
    }
  });
};
