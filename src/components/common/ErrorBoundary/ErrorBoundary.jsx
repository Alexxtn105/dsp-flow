import { Component } from 'react';
import PropTypes from 'prop-types';

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
                <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #888)',
                    fontSize: '13px',
                }}>
                    <p>{this.props.fallbackMessage || 'Ошибка отображения'}</p>
                    <button
                        onClick={this.handleReset}
                        style={{
                            marginTop: '8px',
                            padding: '4px 12px',
                            border: '1px solid var(--border-primary, #ccc)',
                            borderRadius: '4px',
                            background: 'var(--bg-secondary, #f5f5f5)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: 'var(--text-primary, #333)',
                        }}
                    >
                        Повторить
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
