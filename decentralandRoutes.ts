import { Router, Request, Response, NextFunction } from 'express';
import Container from 'typedi';
import decentralandChannel from './decentralandChannel';
import DecentralandChannelPolygon from './decentralandPolygonChannel';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import DecentralandChannel from './decentralandChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/decentraland', route);

  route.post(
    '/test',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/decentraland ticker endpoint with body: %o', req.body);
      try {
        const decentralandETH = Container.get(DecentralandChannel);
        const decentralandPolygon = Container.get(DecentralandChannelPolygon);
        // await decentralandETH.bidCreated(req.body.simulate);
        await decentralandPolygon.polygonBidAccepted(req.body.simulate);
        res.status(201).send('success');
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
