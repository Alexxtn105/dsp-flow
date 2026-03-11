import PropTypes from 'prop-types';

const FLAGS = {
    gb: (
        <svg viewBox="0 0 60 30">
            <rect width="60" height="30" fill="#012169"/>
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#gb-clip)"/>
            <clipPath id="gb-clip">
                <path d="M30,0 L60,0 L30,15 Z M30,30 L0,30 L30,15 Z M0,0 L0,15 L22.5,15 Z M60,30 L60,15 L37.5,15 Z"/>
            </clipPath>
            <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
            <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
        </svg>
    ),
    ru: (
        <svg viewBox="0 0 9 6">
            <rect width="9" height="2" fill="#fff"/>
            <rect width="9" height="2" y="2" fill="#0039A6"/>
            <rect width="9" height="2" y="4" fill="#D52B1E"/>
        </svg>
    ),
    es: (
        <svg viewBox="0 0 750 500">
            <rect width="750" height="500" fill="#c60b1e"/>
            <rect width="750" height="250" y="125" fill="#ffc400"/>
        </svg>
    ),
    fr: (
        <svg viewBox="0 0 9 6">
            <rect width="3" height="6" fill="#002395"/>
            <rect width="3" height="6" x="3" fill="#fff"/>
            <rect width="3" height="6" x="6" fill="#ED2939"/>
        </svg>
    ),
    de: (
        <svg viewBox="0 0 5 3">
            <rect width="5" height="1" fill="#000"/>
            <rect width="5" height="1" y="1" fill="#D00"/>
            <rect width="5" height="1" y="2" fill="#FFCE00"/>
        </svg>
    ),
    cn: (
        <svg viewBox="0 0 30 20">
            <rect width="30" height="20" fill="#DE2910"/>
            <g fill="#FFDE00" transform="translate(5,3.3)">
                <polygon points="0,-3 0.9,0.9 3.5,0.9 1.3,2.5 2.1,5.3 0,3.5 -2.1,5.3 -1.3,2.5 -3.5,0.9 -0.9,0.9"/>
            </g>
            <g fill="#FFDE00" transform="translate(10,1)">
                <polygon points="0,-1 0.3,0.3 1.2,0.3 0.4,0.8 0.7,1.8 0,1.2 -0.7,1.8 -0.4,0.8 -1.2,0.3 -0.3,0.3"/>
            </g>
            <g fill="#FFDE00" transform="translate(12,3)">
                <polygon points="0,-1 0.3,0.3 1.2,0.3 0.4,0.8 0.7,1.8 0,1.2 -0.7,1.8 -0.4,0.8 -1.2,0.3 -0.3,0.3"/>
            </g>
            <g fill="#FFDE00" transform="translate(12,5.5)">
                <polygon points="0,-1 0.3,0.3 1.2,0.3 0.4,0.8 0.7,1.8 0,1.2 -0.7,1.8 -0.4,0.8 -1.2,0.3 -0.3,0.3"/>
            </g>
            <g fill="#FFDE00" transform="translate(10,7.5)">
                <polygon points="0,-1 0.3,0.3 1.2,0.3 0.4,0.8 0.7,1.8 0,1.2 -0.7,1.8 -0.4,0.8 -1.2,0.3 -0.3,0.3"/>
            </g>
        </svg>
    ),
    br: (
        <svg viewBox="0 0 20 14">
            <rect width="20" height="14" fill="#009B3A"/>
            <polygon points="10,1 19,7 10,13 1,7" fill="#FEDF00"/>
            <circle cx="10" cy="7" r="3" fill="#002776"/>
        </svg>
    ),
    jp: (
        <svg viewBox="0 0 3 2">
            <rect width="3" height="2" fill="#fff"/>
            <circle cx="1.5" cy="1" r="0.6" fill="#BC002D"/>
        </svg>
    ),
    kr: (
        <svg viewBox="0 0 3 2">
            <rect width="3" height="2" fill="#fff"/>
            <circle cx="1.5" cy="1" r="0.55" fill="#CD2E3A"/>
            <path d="M1.5,1 A0.275,0.275 0 0 1 1.5,0.45 A0.55,0.55 0 0 1 1.5,1.55 A0.275,0.275 0 0 1 1.5,1" fill="#0047A0"/>
        </svg>
    )
};

function FlagIcon({ code, size = 16 }) {
    const svg = FLAGS[code];
    if (!svg) return null;

    return (
        <span
            className="flag-icon"
            style={{
                display: 'inline-flex',
                width: size * 1.5,
                height: size,
                borderRadius: 2,
                overflow: 'hidden',
                flexShrink: 0,
                verticalAlign: 'middle',
                boxShadow: '0 0 0 0.5px rgba(128,128,128,0.25)'
            }}
            aria-hidden="true"
        >
            {svg}
        </span>
    );
}

FlagIcon.propTypes = {
    code: PropTypes.string.isRequired,
    size: PropTypes.number
};

export default FlagIcon;
