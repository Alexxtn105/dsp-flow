import { Component } from 'react';
import PropTypes from 'prop-types';
import i18n from '../../../locales/i18n.js';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-fallback">
                    <p>{this.props.fallbackMessage || i18n.t('errorBoundary.defaultMessage')}</p>
                    <button
                        onClick={this.handleReset}
                        className="error-boundary-reset-btn"
                    >
                        {i18n.t('errorBoundary.retry')}
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallbackMessage: PropTypes.string,
};

export default ErrorBoundary;
