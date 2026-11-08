import React from 'react';
import { Wifi } from 'lucide-react';
import { TBC_LOGO_URL } from '@/lib/tbc';
import { TbcSign } from '@/components/TbcSign';

/**
 * Card-product preview only.
 *
 * No PAN, expiry, CVV, balance or cardholder identity is generated here. The
 * placeholders are deliberately non-issuable so the UI can show the product
 * without implying that a card programme is live.
 */
export default function CardPreview({ variant = 'virtual' }) {
  const physical = variant === 'physical';
  const label = physical ? 'Physical card' : 'Virtual card';

  return (
    <div
      className={`tb-card-preview tb-card-preview--${variant}`}
      role="img"
      aria-label={`${label} design preview. Not issued. No card number, expiry, CVV or balance exists.`}
    >
      <div className="tb-card-preview__pattern" aria-hidden="true" />
      <div className="tb-card-preview__glow" aria-hidden="true" />

      <div className="tb-card-preview__top">
        <span className="tb-card-preview__brand">
          <span className="tb-card-preview__logo">
            <img
              src={TBC_LOGO_URL}
              alt=""
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          </span>
          <span className="tb-card-preview__wordmark">
            <b>Trading<span>Bible</span></b>
            <small>{physical ? 'Physical' : 'Virtual'} · TBC</small>
          </span>
        </span>
        <span className="tb-card-preview__status"><i aria-hidden="true" /> Not issued</span>
      </div>

      <div className="tb-card-preview__middle">
        <span className="tb-card-preview__chip" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
        <Wifi className="tb-card-preview__contactless" aria-hidden="true" />
      </div>

      <div className="tb-card-preview__number">••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••</div>

      <div className="tb-card-preview__bottom">
        <span className="tb-card-preview__field">
          <small>Cardholder</small>
          <b>CARDHOLDER NAME</b>
        </span>
        <span className="tb-card-preview__field">
          <small>Valid thru</small>
          <b>MM/YY</b>
        </span>
        <span className="tb-card-preview__network">
          <TbcSign />
          <span><b>TBC</b><small>Debit</small></span>
        </span>
      </div>

      <span className="tb-card-preview__watermark" aria-hidden="true">Preview only</span>
    </div>
  );
}
