'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RecipeFormData, Ingredient, Step } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getAdminHeaders } from '@/lib/useAdmin';

interface Props {
  initialData?: Partial<RecipeFormData>;
  recipeId?: string;
  onSave?: (data: RecipeFormData) => Promise<void>;
  lang?: string;
}

const emptyIngredient = (): Ingredient => ({ amount: '', unit: '', item: '', notes: '' });
const emptyStep = (order: number): Step => ({ order, text: '' });

export default function RecipeForm({ initialData, recipeId, onSave, lang = 'en' }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  // All photos as one ordered list (the first is the cover). Built from the
  // cover + the gallery so the admin can delete or reorder any photo, not just
  // the cover. Mirrors the detail page's allImages (cover first, gallery deduped).
  const [images, setImages] = useState<string[]>(() => {
    const cover = initialData?.image_url ? [initialData.image_url] : [];
    const rest = (initialData?.gallery_images || []).filter(u => u && u !== initialData?.image_url);
    return [...cover, ...rest];
  });

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [cuisine, setCuisine] = useState(initialData?.cuisine || '');
  const [totalTime, setTotalTime] = useState(initialData?.total_time || '');
  const [servings, setServings] = useState<number | ''>(initialData?.servings || '');
  const [tagsInput, setTagsInput] = useState((initialData?.tags || []).join(', '));
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients?.length ? initialData.ingredients : [emptyIngredient()]
  );
  const [steps, setSteps] = useState<Step[]>(
    initialData?.steps?.length ? initialData.steps : [emptyStep(1)]
  );

  function updateIngredient(i: number, field: keyof Ingredient, value: string) {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  }
  function removeIngredient(i: number) {
    setIngredients(prev => prev.filter((_, idx) => idx !== i));
  }
  function addIngredient() {
    setIngredients(prev => [...prev, emptyIngredient()]);
  }

  function updateStep(i: number, text: string) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, text } : s));
  }
  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));
  }
  function addStep() {
    setSteps(prev => [...prev, emptyStep(prev.length + 1)]);
  }

  // Remove any photo (cover or gallery) — just drops it from this recipe's list;
  // the storage object is left in place (the public bucket disallows anon DELETE).
  function removeImage(i: number) {
    setImages(prev => prev.filter((_, idx) => idx !== i));
  }
  // Promote a gallery photo to the cover by moving it to the front.
  function setCover(i: number) {
    setImages(prev => {
      const next = [...prev];
      const [picked] = next.splice(i, 1);
      return [picked, ...next];
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    const ext = file.name.split('.').pop();
    const path = `recipe-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('recipe-images').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('recipe-images').getPublicUrl(path);
      setImages(prev => [...prev, data.publicUrl]);
    }
    setImageUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const data: RecipeFormData = {
      title: title.trim(),
      description: description.trim() || undefined,
      cuisine: cuisine.trim() || undefined,
      total_time: totalTime.trim() || undefined,
      servings: servings ? Number(servings) : undefined,
      tags,
      ingredients: ingredients.filter(i => i.item.trim()),
      steps: steps.filter(s => s.text.trim()).map((s, idx) => ({ ...s, order: idx + 1 })),
      notes: notes.trim() || undefined,
      // First photo is the cover; send the whole list as the gallery. Sending
      // explicit null/[] (not undefined) so removing a photo actually clears it
      // server-side instead of leaving the old value untouched.
      image_url: images[0] ?? null,
      gallery_images: images,
      source_type: initialData?.source_type || 'manual',
      source_url: initialData?.source_url,
    };

    if (onSave) {
      await onSave(data);
    } else if (recipeId) {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(data),
      });
      if (res.ok) router.push(`/${lang}/recipes/${recipeId}`);
    } else {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        router.push(`/${lang}/recipes/${created.recipe.id}`);
      }
    }
    setSaving(false);
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-shadow";
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' };
  const labelClass = "block text-sm font-medium mb-1";
  const labelStyle = { color: 'var(--text)' };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Title */}
      <div>
        <label className={labelClass} style={labelStyle}>Title <span style={{ color: 'var(--accent)' }}>*</span></label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          placeholder="e.g. Grandma's Lasagna"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass} style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="A short description of the dish..."
          rows={2}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Cuisine / Time / Servings */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>Cuisine</label>
          <input type="text" value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="Italian" className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Total Time</label>
          <input type="text" value={totalTime} onChange={e => setTotalTime(e.target.value)} placeholder="45 min" className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Servings</label>
          <input type="number" value={servings} onChange={e => setServings(e.target.value ? Number(e.target.value) : '')} placeholder="4" min={1} className={inputClass} style={inputStyle} />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass} style={labelStyle}>Tags <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>(comma-separated)</span></label>
        <input
          type="text"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="vegetarian, quick, comfort food"
          className={inputClass}
          style={inputStyle}
        />
        {tagsInput && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tagsInput.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ingredients */}
      <div>
        <label className={labelClass} style={labelStyle}>Ingredients</label>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={ing.amount}
                onChange={e => updateIngredient(i, 'amount', e.target.value)}
                placeholder="2"
                className="w-16 px-2 py-2 rounded-lg border text-sm outline-none"
                style={inputStyle}
              />
              <input
                type="text"
                value={ing.unit}
                onChange={e => updateIngredient(i, 'unit', e.target.value)}
                placeholder="cups"
                className="w-20 px-2 py-2 rounded-lg border text-sm outline-none"
                style={inputStyle}
              />
              <input
                type="text"
                value={ing.item}
                onChange={e => updateIngredient(i, 'item', e.target.value)}
                placeholder="flour"
                className="flex-1 px-2 py-2 rounded-lg border text-sm outline-none"
                style={inputStyle}
              />
              <input
                type="text"
                value={ing.notes || ''}
                onChange={e => updateIngredient(i, 'notes', e.target.value)}
                placeholder="notes"
                className="w-28 px-2 py-2 rounded-lg border text-sm outline-none"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="p-1 rounded text-lg leading-none hover:opacity-60"
                style={{ color: 'var(--muted)' }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addIngredient}
            className="text-sm font-medium mt-1 hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            + Add Ingredient
          </button>
        </div>
      </div>

      {/* Steps */}
      <div>
        <label className={labelClass} style={labelStyle}>Steps</label>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1.5" style={{ background: 'var(--accent)' }}>
                {i + 1}
              </span>
              <textarea
                value={step.text}
                onChange={e => updateStep(i, e.target.value)}
                placeholder={`Step ${i + 1}...`}
                rows={2}
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="p-1 rounded text-lg leading-none hover:opacity-60 mt-1.5"
                style={{ color: 'var(--muted)' }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStep}
            className="text-sm font-medium mt-1 hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            + Add Step
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass} style={labelStyle}>Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Tips, variations, storage instructions..."
          rows={3}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Photos */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Photos{' '}
          <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>(the first photo is the cover)</span>
        </label>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-3">
            {images.map((img, i) => (
              <div
                key={`${img}-${i}`}
                className="relative h-28 w-36 rounded-lg overflow-hidden border"
                style={{ borderColor: i === 0 ? 'var(--secondary)' : 'var(--border)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                {i === 0 ? (
                  <span
                    className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-white"
                    style={{ background: 'var(--secondary)', fontSize: 11 }}
                  >
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCover(i)}
                    className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/55 text-white hover:bg-black/75"
                    style={{ fontSize: 11 }}
                  >
                    Set cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center text-sm hover:bg-black/75"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={imageUploading}
          className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60"
          style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--card)' }}
        >
          {imageUploading ? 'Uploading...' : images.length ? 'Add Photo' : 'Upload Image'}
        </button>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
          style={{ background: 'var(--accent)' }}
          onMouseOver={e => { if (!saving) e.currentTarget.style.background = 'var(--accent-hover)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'var(--accent)'; }}
        >
          {saving ? 'Saving...' : recipeId ? 'Update Recipe' : 'Save Recipe'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
