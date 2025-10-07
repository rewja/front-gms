import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../components/NotificationSystem';

export const useErrorHandler = () => {
  const { t } = useTranslation();
  const { error: showError } = useNotification();

  const handleError = useCallback((error, customMessage = null) => {
    console.error('Error occurred:', error);

    let message = customMessage;
    let title = t('notifications.error');

    if (!message) {
      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      } else if (error?.response?.status) {
        switch (error.response.status) {
          case 400:
            message = t('errors.validationError');
            break;
          case 401:
            message = t('errors.unauthorized');
            break;
          case 403:
            message = t('errors.forbidden');
            break;
          case 404:
            message = t('errors.notFound');
            break;
          case 500:
            message = t('errors.serverError');
            break;
          default:
            message = t('errors.unknownError');
        }
      } else if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
        message = t('errors.networkError');
      } else {
        message = t('errors.unknownError');
      }
    }

    showError(message, { title });
  }, [t, showError]);

  const handleApiError = useCallback((error, operation = 'operation') => {
    const operationMessages = {
      create: t('errors.createError'),
      update: t('errors.updateError'),
      delete: t('errors.deleteError'),
      load: t('errors.loadError'),
      upload: t('errors.uploadError'),
    };

    const customMessage = operationMessages[operation] || `${operation} failed`;
    handleError(error, customMessage);
  }, [handleError, t]);

  return {
    handleError,
    handleApiError,
  };
};

export default useErrorHandler;



