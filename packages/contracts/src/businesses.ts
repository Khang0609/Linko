export type {
  BusinessCreate,
  BusinessResponse,
  NeedCreate,
  OfferCreate,
  PersonCreate,
} from './generated/types.gen';

import {
  zBusinessCreate,
  zBusinessResponse,
  zNeedCreate,
  zOfferCreate,
  zPersonCreate,
} from './generated/zod.gen';

export const BusinessCreateSchema = zBusinessCreate.superRefine((value, context) => {
  if (!value.offers?.length && !value.needs?.length) {
    context.addIssue({
      code: 'custom',
      message: 'At least one offer or need is required.',
      path: ['offers'],
    });
  }
});

export {
  zBusinessResponse as BusinessResponseSchema,
  zNeedCreate as NeedCreateSchema,
  zOfferCreate as OfferCreateSchema,
  zPersonCreate as PersonCreateSchema,
};
