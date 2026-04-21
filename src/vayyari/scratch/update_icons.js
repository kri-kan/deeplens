const fs = require('fs');
const path = require('path');

const saree = fs.readFileSync('assets/images/saree.svg', 'utf8');
const dress = fs.readFileSync('assets/images/dress.svg', 'utf8');
const lehanga = fs.readFileSync('assets/images/lehanga.svg', 'utf8');
const kids = fs.readFileSync('assets/images/kids.svg', 'utf8');

const content = \`import React from 'react';
import Svg, { Path, G, SvgXml } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

const sareeXml = \\\`\${saree}\\\`;
const dressXml = \\\`\${dress}\\\`;
const lehangaXml = \\\`\${lehanga}\\\`;
const kidsXml = \\\`\${kids}\\\`;

export const SareeIcon = ({ color, size = 32 }: IconProps) => (
  <SvgXml xml={sareeXml} width={size} height={size} />
);

export const DressIcon = ({ color, size = 32 }: IconProps) => (
  <SvgXml xml={dressXml} width={size} height={size} />
);

export const LehangaIcon = ({ color, size = 32 }: IconProps) => (
  <SvgXml xml={lehangaXml} width={size} height={size} />
);

export const KidsIcon = ({ color, size = 32 }: IconProps) => (
  <SvgXml xml={kidsXml} width={size} height={size} />
);

export const OtherLadiesIcon = ({ color, size = 32 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <G fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M35 25l5-5c10 4 20 0 20 0l5 5 10 15-5 3s-5-3-5 5v15H35V43c0-8-5-5-5-5l-5-3 10-15z" />
      <Path d="M35 55l-5 25s5 5 20 5 20-5 20-5l-5-25H35z" />
    </G>
  </Svg>
);
\`;

fs.writeFileSync('components/CategoryIcons.tsx', content);
console.log('Successfully updated components/CategoryIcons.tsx');
