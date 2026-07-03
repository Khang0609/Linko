import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  BusinessCreateSchema,
  BusinessResponseSchema,
  NeedCreateSchema,
  OfferCreateSchema,
  PersonCreateSchema,
  ProblemDetailSchema,
  type BusinessCreate,
  type BusinessResponse,
} from './index';

const validOffer = {
  intent_type: 'find_buyer',
  title: 'Wholesale traditional fish sauce',
  category_l1: 'ban_buon_ban_le',
  geo_scope: ['TP.HCM'],
  structured_attrs: {
    product_category: 'gia_vi_nuoc_cham',
  },
} as const;

const validBusinessCreate = {
  name: 'Nam Phuc Foods Co Ltd',
  industry_l1: 'san_xuat_che_bien',
  province: 'TP.HCM',
  offers: [validOffer],
} as const;

describe('business onboarding contracts', () => {
  it('parses a valid BusinessCreate payload', () => {
    expect(BusinessCreateSchema.parse(validBusinessCreate)).toMatchObject(validBusinessCreate);
  });

  it('parses a valid BusinessResponse payload', () => {
    const response = {
      ...validBusinessCreate,
      id: '4c43fd62-34ad-4df1-96a6-7d6a0030e866',
      created_at: '2026-07-02T08:00:00Z',
      data_source: 'self_reported',
      verification_status: 'unverified',
      warnings: [],
    };

    expect(BusinessResponseSchema.parse(response)).toMatchObject(response);
  });

  it('rejects missing required fields', () => {
    expect(
      BusinessCreateSchema.safeParse({ ...validBusinessCreate, name: undefined }).success,
    ).toBe(false);
    expect(
      BusinessCreateSchema.safeParse({ ...validBusinessCreate, province: undefined }).success,
    ).toBe(false);
  });

  it('rejects payloads without at least one offer or need', () => {
    const result = BusinessCreateSchema.safeParse({
      name: 'Nam Phuc Foods Co Ltd',
      industry_l1: 'san_xuat_che_bien',
      province: 'TP.HCM',
      offers: [],
      needs: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid intent_type enum values', () => {
    expect(
      OfferCreateSchema.safeParse({
        ...validOffer,
        intent_type: 'link_shortener',
      }).success,
    ).toBe(false);
  });

  it('keeps NeedCreate aligned with OfferCreate fields', () => {
    expect(
      NeedCreateSchema.safeParse({ ...validOffer, intent_type: 'find_supplier' }).success,
    ).toBe(true);
  });

  it('parses a contact person and RFC 9457 problem response', () => {
    expect(
      PersonCreateSchema.safeParse({ full_name: 'Minh Anh Nguyen', role: 'owner' }).success,
    ).toBe(true);
    expect(
      ProblemDetailSchema.safeParse({
        type: 'https://linko.vn/problems/request-validation',
        title: 'Request validation failed',
        status: 422,
        detail: 'Request body failed validation.',
        instance: '/api/v1/businesses',
        errors: [{ field: 'province', message: 'Field required', type: 'missing' }],
      }).success,
    ).toBe(true);
  });

  it('exposes inferred types for frontend callers', () => {
    expectTypeOf<BusinessCreate>().toMatchTypeOf<{
      name: string;
      industry_l1: string;
      province: string;
    }>();
    expectTypeOf<BusinessResponse>().toMatchTypeOf<
      BusinessCreate & { id: string; created_at: string }
    >();
  });
});
