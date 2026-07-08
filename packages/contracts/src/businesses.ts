export type {
  BusinessDetailResponse,
  BusinessCreate,
  BusinessResponse,
  BusinessUpdate,
  NeedCreate,
  NeedResponse,
  NeedUpdate,
  OfferCreate,
  OfferResponse,
  OfferUpdate,
  PersonCreate,
  PersonResponse,
  PersonUpdate,
} from './generated/types.gen';

import {
  zBusinessDetailResponse,
  zBusinessCreate,
  zBusinessResponse,
  zNeedCreate,
  zNeedResponse,
  zNeedUpdate,
  zOfferCreate,
  zOfferResponse,
  zOfferUpdate,
  zPersonCreate,
  zPersonResponse,
  zPersonUpdate,
  zBusinessUpdate,
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
  zBusinessDetailResponse as BusinessDetailResponseSchema,
  zBusinessResponse as BusinessResponseSchema,
  zBusinessUpdate as BusinessUpdateSchema,
  zNeedCreate as NeedCreateSchema,
  zNeedResponse as NeedResponseSchema,
  zNeedUpdate as NeedUpdateSchema,
  zOfferCreate as OfferCreateSchema,
  zOfferResponse as OfferResponseSchema,
  zOfferUpdate as OfferUpdateSchema,
  zPersonCreate as PersonCreateSchema,
  zPersonResponse as PersonResponseSchema,
  zPersonUpdate as PersonUpdateSchema,
};
