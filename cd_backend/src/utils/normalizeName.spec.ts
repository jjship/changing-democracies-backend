import { expect } from 'chai';
import { normalizeName } from './normalizeName';

describe('normalizeName', () => {
  it('should lowercase a simple name', () => {
    expect(normalizeName('John Doe')).to.equal('john doe');
  });

  it('should strip accents from Spanish names', () => {
    expect(normalizeName('José María García')).to.equal('jose maria garcia');
  });

  it('should strip diacritics from Czech names', () => {
    expect(normalizeName('Jiří Říha')).to.equal('jiri riha');
  });

  it('should trim surrounding whitespace', () => {
    expect(normalizeName('  Alice  ')).to.equal('alice');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeName('')).to.equal('');
  });
});
