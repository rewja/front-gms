import React from "react";
import { useTranslation } from "react-i18next";
import { useTranslatedLabels } from "../hooks/useTranslatedLabels";

// Contoh komponen yang menunjukkan cara menggunakan i18n
const ExampleI18nUsage = () => {
  const { t } = useTranslation();
  const { formatStatusLabel, formatPriorityLabel, formatRoleLabel } = useTranslatedLabels();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">{t('dashboard.title')}</h2>
      <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      
      {/* Contoh menggunakan teks langsung */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold">{t('todos.title')}</h3>
          <p className="text-sm text-gray-600">{t('todos.subtitle')}</p>
          <button className="btn-primary mt-2">
            {t('todos.createNew')}
          </button>
        </div>
        
        <div className="card p-4">
          <h3 className="font-semibold">{t('users.title')}</h3>
          <p className="text-sm text-gray-600">{t('users.subtitle')}</p>
          <button className="btn-primary mt-2">
            {t('users.addNewUser')}
          </button>
        </div>
      </div>

      {/* Contoh menggunakan hook untuk format label */}
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Contoh Status Labels dengan Terjemahan:</h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <span className="p-2 bg-yellow-100 rounded">
            {formatStatusLabel("pending")}
          </span>
          <span className="p-2 bg-green-100 rounded">
            {formatStatusLabel("completed")}
          </span>
          <span className="p-2 bg-blue-100 rounded">
            {formatStatusLabel("in_progress")}
          </span>
          <span className="p-2 bg-red-100 rounded">
            {formatPriorityLabel("high")}
          </span>
          <span className="p-2 bg-yellow-100 rounded">
            {formatPriorityLabel("medium")}
          </span>
          <span className="p-2 bg-green-100 rounded">
            {formatPriorityLabel("low")}
          </span>
          <span className="p-2 bg-purple-100 rounded">
            {formatRoleLabel("admin_ga")}
          </span>
          <span className="p-2 bg-blue-100 rounded">
            {formatRoleLabel("user")}
          </span>
          <span className="p-2 bg-orange-100 rounded">
            {formatRoleLabel("procurement")}
          </span>
        </div>
      </div>

      {/* Contoh menggunakan common text */}
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Common Actions:</h3>
        <div className="space-x-2">
          <button className="btn-primary">{t('common.save')}</button>
          <button className="btn-secondary">{t('common.cancel')}</button>
          <button className="btn-danger">{t('common.delete')}</button>
          <button className="btn-secondary">{t('common.edit')}</button>
          <button className="btn-secondary">{t('common.view')}</button>
        </div>
      </div>

      {/* Form example */}
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Form Example:</h3>
        <form className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('common.name')}
            </label>
            <input 
              type="text" 
              className="w-full p-2 border rounded"
              placeholder={`${t('common.name')}...`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('common.email')}
            </label>
            <input 
              type="email" 
              className="w-full p-2 border rounded"
              placeholder={`${t('common.email')}...`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('common.description')}
            </label>
            <textarea 
              className="w-full p-2 border rounded"
              placeholder={`${t('common.description')}...`}
              rows="3"
            />
          </div>
          <div className="flex space-x-2">
            <button type="submit" className="btn-primary">
              {t('common.submit')}
            </button>
            <button type="button" className="btn-secondary">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExampleI18nUsage;





