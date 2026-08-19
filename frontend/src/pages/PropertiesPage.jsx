import { useState } from 'react';
import { propertyApi, unitApi } from '../api/resources.js';
import useFetch from '../../useFetch.js';
import Badge from '../components/ui/Badge.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Modal, { Field, inputClass } from '../components/ui/Modal.jsx';
import { ErrorState, Loading } from '../components/ui/States.jsx';
import { peso, statusColor, statusLabel } from '../../lib.js';

const EMPTY_PROPERTY = { name: '', type: 'apartment', address: '', floors: 1, description: '' };
const EMPTY_UNIT = { unitNumber: '', floor: 1, monthlyRent: '', description: '' };

export default function PropertiesPage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [propertyModal, setPropertyModal] = useState(false);
  const [unitModal, setUnitModal] = useState(false);
  const [propertyForm, setPropertyForm] = useState(EMPTY_PROPERTY);
  const [unitForm, setUnitForm] = useState(EMPTY_UNIT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const properties = useFetch(() => propertyApi.list(query ? { q: query } : {}), [query]);
  const units = useFetch(
    () => (selected ? unitApi.byProperty(selected) : Promise.resolve([])),
    [selected],
  );

  const submitProperty = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await propertyApi.create({ ...propertyForm, floors: Number(propertyForm.floors) });
      setPropertyModal(false);
      setPropertyForm(EMPTY_PROPERTY);
      properties.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitUnit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await unitApi.create({
        ...unitForm,
        property: selected,
        floor: Number(unitForm.floor),
        monthlyRent: Number(unitForm.monthlyRent),
      });
      setUnitModal(false);
      setUnitForm(EMPTY_UNIT);
      units.refetch();
      properties.refetch(); // occupancy counts change
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedProperty = properties.data?.find((p) => p._id === selected);

  return (
    <div>
      <SectionHeader
        title="Properties"
        action="Add property"
        onAction={() => {
          setFormError(null);
          setPropertyModal(true);
        }}
      />

      <SearchBar placeholder="Search by property name" value={query} onChange={setQuery} />

      {properties.loading && <Loading />}
      {properties.error && <ErrorState message={properties.error} onRetry={properties.refetch} />}

      {properties.data && (
        <div className="space-y-2 mb-6">
          {properties.data.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              No properties yet. Add your first one to get started.
            </p>
          )}
          {properties.data.map((property) => (
            <button
              key={property._id}
              type="button"
              onClick={() => setSelected(selected === property._id ? null : property._id)}
              className={`w-full text-left border rounded-lg px-4 py-3 transition-all ${
                selected === property._id
                  ? 'border-slate-700 bg-slate-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{property.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {property.address} · {property.floors} floor{property.floors === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {property.occupiedCount} / {property.unitCount} units occupied
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
              Units — {selectedProperty?.name}
            </h3>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setUnitModal(true);
              }}
              className="text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors text-slate-700"
            >
              + Add unit
            </button>
          </div>

          {units.loading && <Loading />}
          {units.error && <ErrorState message={units.error} onRetry={units.refetch} />}
          {units.data && (
            <DataTable
              columns={[
                { key: 'unit', label: 'Unit' },
                { key: 'floor', label: 'Floor', hideBelow: 'md' },
                { key: 'rent', label: 'Rent', align: 'right' },
                { key: 'status', label: 'Status', align: 'right' },
              ]}
              rows={units.data}
              emptyMessage="No units on this property yet."
              renderRow={(unit) => (
                <tr key={unit._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-700">Unit {unit.unitNumber}</td>
                  <td className="py-3 px-4 text-gray-400 hidden md:table-cell">Floor {unit.floor}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {peso(unit.monthlyRent)} / mo
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge label={statusLabel(unit.status)} color={statusColor(unit.status)} />
                  </td>
                </tr>
              )}
            />
          )}
        </div>
      )}

      <Modal open={propertyModal} title="Add property" onClose={() => setPropertyModal(false)}>
        <form onSubmit={submitProperty}>
          {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}
          <Field label="Name">
            <input
              className={inputClass}
              value={propertyForm.name}
              onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Type">
            <select
              className={inputClass}
              value={propertyForm.type}
              onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })}
            >
              {['apartment', 'house', 'condo', 'bedspace', 'commercial'].map((type) => (
                <option key={type} value={type}>
                  {statusLabel(type)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address">
            <input
              className={inputClass}
              value={propertyForm.address}
              onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
              required
            />
          </Field>
          <Field label="Floors">
            <input
              type="number"
              min="1"
              className={inputClass}
              value={propertyForm.floors}
              onChange={(e) => setPropertyForm({ ...propertyForm, floors: e.target.value })}
            />
          </Field>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add property'}
          </button>
        </form>
      </Modal>

      <Modal open={unitModal} title="Add unit" onClose={() => setUnitModal(false)}>
        <form onSubmit={submitUnit}>
          {formError && <p className="mb-3 text-xs text-red-600">{formError}</p>}
          <Field label="Unit number">
            <input
              className={inputClass}
              value={unitForm.unitNumber}
              onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
              required
            />
          </Field>
          <Field label="Floor">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={unitForm.floor}
              onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })}
            />
          </Field>
          <Field label="Monthly rent">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={unitForm.monthlyRent}
              onChange={(e) => setUnitForm({ ...unitForm, monthlyRent: e.target.value })}
              required
            />
          </Field>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add unit'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
