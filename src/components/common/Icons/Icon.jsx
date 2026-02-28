import PropTypes from 'prop-types';
import DSP_ICONS from './DspIcons.jsx';
import './Icon.css';

const SIZE_PX = { small: 18, medium: 24, large: 32, xlarge: 40 };

/**
 * Централизованный компонент иконок.
 * Поддерживает кастомные DSP SVG-иконки (dsp-*) и Material Icons.
 */
function Icon({ name, variant = 'filled', size = 'medium', className = '', ...props }) {

    /* ---------- Custom DSP SVG icon ---------- */
    const dspContent = DSP_ICONS[name];
    if (dspContent) {
        const px = SIZE_PX[size] || SIZE_PX.medium;
        return (
            <svg
                viewBox="0 0 24 24"
                width={px}
                height={px}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`dsp-icon icon-${size} ${className}`}
                aria-hidden="true"
                {...props}
            >
                {dspContent}
            </svg>
        );
    }

    /* ---------- Material Icon (fallback) ---------- */
    const getVariantClass = () => {
        switch(variant) {
            case 'outlined': return 'material-icons-outlined';
            case 'rounded': return 'material-icons-round';
            case 'sharp': return 'material-icons-sharp';
            default: return 'material-icons';
        }
    };

    return (
        <span
            className={`${getVariantClass()} icon-${size} ${className}`}
            {...props}
        >
            {name}
        </span>
    );
}

Icon.propTypes = {
    name: PropTypes.string.isRequired,
    variant: PropTypes.oneOf(['filled', 'outlined', 'rounded', 'sharp']),
    size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge']),
    className: PropTypes.string
};

export default Icon;
