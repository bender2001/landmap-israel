import styled, { css } from 'styled-components'
import { media } from '../../styles/theme'

/* ── Input ──────────────────────────────────────────────────── */

export const Input = styled.input<{ $sm?: boolean }>`
  width: 100%;
  padding: ${({ $sm }) => $sm ? '8px 12px' : '12px 16px'};
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.slate[200]};
  font-size: ${({ $sm }) => $sm ? '12px' : '14px'};
  transition: border-color ${({ theme }) => theme.transitions.normal};
  min-height: 44px;

  &::placeholder { color: ${({ theme }) => theme.colors.slate[500]}; }
  &:focus {
    border-color: rgba(200, 148, 42, 0.5);
    outline: none;
  }
`

/* ── Select ─────────────────────────────────────────────────── */

export const Select = styled.select<{ $sm?: boolean }>`
  width: 100%;
  padding: ${({ $sm }) => $sm ? '8px 12px' : '12px 16px'};
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.slate[200]};
  font-size: ${({ $sm }) => $sm ? '12px' : '14px'};
  transition: border-color ${({ theme }) => theme.transitions.normal};
  min-height: 44px;
  cursor: pointer;

  &:focus {
    border-color: rgba(200, 148, 42, 0.5);
    outline: none;
  }
`

/* ── SearchInput ────────────────────────────────────────────── */

export const SearchInputWrap = styled.div<{ $focused?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.full};
  background: rgba(8, 18, 35, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  min-height: 44px;

  ${({ $focused }) =>
    $focused
      ? css`
          border-color: rgba(200, 148, 42, 0.3);
          box-shadow: 0 0 0 3px rgba(200, 148, 42, 0.08);
        `
      : css`
          &:hover { border-color: rgba(200, 148, 42, 0.2); }
        `}
`

export const SearchField = styled.input`
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: ${({ theme }) => theme.colors.slate[200]};
  font-size: 12px;
  text-align: right;

  &::placeholder {
    color: ${({ theme }) => theme.colors.slate[500]};
  }
`

/* ── RangeSlider ────────────────────────────────────────────── */

export const RangeSlider = styled.input.attrs({ type: 'range' })`
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #C8942A, #E5B94E);
    cursor: pointer;
    border: 2px solid rgba(10, 22, 40, 0.8);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #C8942A, #E5B94E);
    cursor: pointer;
    border: 2px solid rgba(10, 22, 40, 0.8);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }
`

/* ── Checkbox ───────────────────────────────────────────────── */

export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  accent-color: ${({ theme }) => theme.colors.gold};
  cursor: pointer;
`
