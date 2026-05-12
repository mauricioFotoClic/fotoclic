import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Toast from '../Toast';

interface CommunicationSettingsProps {
  user: User;
  onUpdate: (user: User) => void;
}

const DEFAULT_TEMPLATES = {
  abandoned_cart: {
    email_subject: "Você esqueceu algo especial no FotoClic!",
    email_body: "Olá {{nome_cliente}},\n\nNotamos que você deixou algumas fotos incríveis no seu carrinho:\n\n{{lista_fotos}}\n\nElas ainda estão esperando por você. Clique aqui para finalizar sua compra!\n\nAtenciosamente,\n{{nome_fotografo}}",
    whatsapp_text: "Olá {{nome_cliente}}, aqui é {{nome_fotografo}} da FotoClic! \n\nVi que você deixou algumas fotos no seu carrinho: \n{{lista_fotos}} \n\nElas estão incríveis! Gostaria de alguma ajuda para finalizar sua compra?"
  }
};

const CommunicationSettings: React.FC<CommunicationSettingsProps> = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

  useEffect(() => {
    if (user.communication_templates?.abandoned_cart) {
      setTemplates({
        abandoned_cart: {
          ...DEFAULT_TEMPLATES.abandoned_cart,
          ...user.communication_templates.abandoned_cart
        }
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await api.updatePhotographer(user.id, {
        communication_templates: templates
      });
      onUpdate(updatedUser);
      setNotification({ message: 'Templates salvos com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Error saving templates:", error);
      setNotification({ message: 'Erro ao salvar templates.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const insertTag = (field: 'email_subject' | 'email_body' | 'whatsapp_text', tag: string) => {
    setTemplates(prev => {
      const currentText = prev.abandoned_cart[field];
      return {
        ...prev,
        abandoned_cart: {
          ...prev.abandoned_cart,
          [field]: currentText + tag
        }
      };
    });
  };

  const handleTextChange = (field: 'email_subject' | 'email_body' | 'whatsapp_text', value: string) => {
    setTemplates(prev => ({
      ...prev,
      abandoned_cart: {
        ...prev.abandoned_cart,
        [field]: value
      }
    }));
  };

  const TagButton = ({ label, tag, field }: { label: string, tag: string, field: 'email_subject' | 'email_body' | 'whatsapp_text' }) => (
    <button
      onClick={() => insertTag(field, tag)}
      className="text-xs bg-neutral-100 hover:bg-secondary/10 hover:text-secondary text-neutral-600 px-2 py-1 rounded transition-colors border border-neutral-200 hover:border-secondary/30 mr-2 mb-2"
      title={`Inserir ${tag}`}
    >
      {label}
    </button>
  );

  const availableTags = [
    { label: 'Nome do Cliente', tag: '{{nome_cliente}}' },
    { label: 'Lista de Fotos', tag: '{{lista_fotos}}' },
    { label: 'Seu Nome', tag: '{{nome_fotografo}}' },
    { label: 'Valor Total', tag: '{{valor_total}}' },
  ];

  if (loading) return <Spinner />;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-primary-dark">Configurações de Comunicação</h1>
        <p className="text-neutral-600 mt-1">Personalize as mensagens automáticas enviadas para os seus clientes.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden mb-6">
        <div className="border-b border-neutral-200 bg-neutral-50 p-4">
          <h2 className="font-semibold text-lg text-neutral-800 flex items-center">
            <span className="text-xl mr-2">🛒</span> Carrinho Abandonado
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Mensagens enviadas quando o cliente adiciona fotos ao carrinho, mas não finaliza a compra.
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* Email Settings */}
          <div>
            <h3 className="text-md font-medium text-neutral-900 mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">✉️</span>
              Template de E-mail
            </h3>
            
            <div className="space-y-4 ml-10">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Assunto do E-mail
                </label>
                <input
                  type="text"
                  value={templates.abandoned_cart.email_subject}
                  onChange={(e) => handleTextChange('email_subject', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Corpo da Mensagem
                </label>
                <div className="mb-2">
                  <span className="text-xs text-neutral-500 block mb-1">Inserir variáveis:</span>
                  <div className="flex flex-wrap">
                    {availableTags.map(t => (
                      <TagButton key={t.tag} label={t.label} tag={t.tag} field="email_body" />
                    ))}
                  </div>
                </div>
                <textarea
                  value={templates.abandoned_cart.email_body}
                  onChange={(e) => handleTextChange('email_body', e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary resize-y font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* WhatsApp Settings */}
          <div>
            <h3 className="text-md font-medium text-neutral-900 mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2">💬</span>
              Template de WhatsApp
            </h3>
            
            <div className="space-y-4 ml-10">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Mensagem
                </label>
                <div className="mb-2">
                  <span className="text-xs text-neutral-500 block mb-1">Inserir variáveis:</span>
                  <div className="flex flex-wrap">
                    {availableTags.map(t => (
                      <TagButton key={t.tag} label={t.label} tag={t.tag} field="whatsapp_text" />
                    ))}
                  </div>
                </div>
                <textarea
                  value={templates.abandoned_cart.whatsapp_text}
                  onChange={(e) => handleTextChange('whatsapp_text', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 resize-y font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 px-6 py-4 flex justify-end border-t border-neutral-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-secondary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {notification && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default CommunicationSettings;
