import PropTypes from 'prop-types';
import './Icon.css';

/**
 * Централизованный компонент для работы с Material Icons
 */
function Icon({ name, variant = 'filled', size = 'medium', className = '', ...props }) {
    const getVariantClass = () => {
        switch(variant) {
            case 'outlined': return 'material-icons-outlined';
            case 'rounded': return 'material-icons-round';
            case 'sharp': return 'material-icons-sharp';
            default: return 'material-icons';
        }
    };

    const getSizeClass = () => {
        switch(size) {
            case 'small': return 'icon-small';
            case 'large': return 'icon-large';
            case 'xlarge': return 'icon-xlarge';
            default: return 'icon-medium';
        }
    };

    return (
        <span
            className={`${getVariantClass()} ${getSizeClass()} ${className}`}
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