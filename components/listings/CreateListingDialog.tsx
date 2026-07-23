'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Upload, Loader2, View } from 'lucide-react'

const LISTING_TYPES = [
  { value: 'sale', label: 'For Sale', priceLabel: 'Price (KES)' },
  { value: 'long_term_rent', label: 'Long-term Rent', priceLabel: 'Monthly Rent (KES)' },
  { value: 'short_term_rent', label: 'Short-let (Airbnb-style)', priceLabel: 'Nightly Rate (KES)' },
  { value: 'commercial', label: 'Commercial', priceLabel: 'Price / Monthly Rent (KES)' },
  { value: 'land', label: 'Land', priceLabel: 'Price (KES)' },
] as const

type ListingType = (typeof LISTING_TYPES)[number]['value']

const RESIDENTIAL_TYPES: ListingType[] = ['sale', 'long_term_rent', 'short_term_rent']

const listingFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().min(3, 'Location is required'),
  listingType: z.enum(['sale', 'long_term_rent', 'short_term_rent', 'commercial', 'land']),
  price: z.number().min(1, 'Price must be greater than 0'),
  bedrooms: z.number().min(0, 'Bedrooms cannot be negative'),
  bathrooms: z.number().min(0, 'Bathrooms cannot be negative'),
  area: z.number().min(0, 'Area cannot be negative'),
})

type ListingFormValues = z.infer<typeof listingFormSchema>

interface CreateListingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onListingCreated: () => void
}

export default function CreateListingDialog({
  open,
  onOpenChange,
  onListingCreated,
}: CreateListingDialogProps) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [amenitiesInput, setAmenitiesInput] = useState('')
  const [landSizeAcres, setLandSizeAcres] = useState('')
  const [leaseTermMonths, setLeaseTermMonths] = useState('')
  const [minimumStayNights, setMinimumStayNights] = useState('')
  const [exactLocation, setExactLocation] = useState('')
  const [distanceToRoad, setDistanceToRoad] = useState('')
  const [nearbyInput, setNearbyInput] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [caretakerName, setCaretakerName] = useState('')
  const [caretakerPhone, setCaretakerPhone] = useState('')
  const [tourMode, setTourMode] = useState<'none' | 'link' | 'upload'>('none')
  const [virtualTourUrl, setVirtualTourUrl] = useState('')
  const [virtualTourUrlError, setVirtualTourUrlError] = useState('')
  const [tourImageFile, setTourImageFile] = useState<File | null>(null)
  const [tourImagePreview, setTourImagePreview] = useState<string | null>(null)

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      listingType: 'long_term_rent',
      price: 0,
      bedrooms: 1,
      bathrooms: 1,
      area: 0,
    },
  })

  const listingType = form.watch('listingType')
  const isResidential = RESIDENTIAL_TYPES.includes(listingType)
  const priceLabel = LISTING_TYPES.find((t) => t.value === listingType)?.priceLabel || 'Price (KES)'

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTourImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTourImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setTourImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (values: ListingFormValues) => {
    if (!imageFile) {
      toast.error('Please select an image for the listing')
      return
    }

    const trimmedTourUrl = virtualTourUrl.trim()
    if (tourMode === 'link') {
      try {
        new URL(trimmedTourUrl)
        setVirtualTourUrlError('')
      } catch {
        setVirtualTourUrlError('Enter a valid link, e.g. https://kuula.co/share/...')
        return
      }
    }
    if (tourMode === 'upload' && !tourImageFile) {
      toast.error('Select a 360° photo to upload, or switch to "No tour" below')
      return
    }

    setIsSubmitting(true)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session?.user) {
        toast.error('You must be logged in')
        return
      }

      // Upload image
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('listings')
        .upload(`${session.data.session.user.id}/${fileName}`, imageFile)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('listings')
        .getPublicUrl(`${session.data.session.user.id}/${fileName}`)

      // Upload 360 tour photo, if provided directly (landlord owns a real 360 camera)
      let tourImagePublicUrl: string | null = null
      if (tourMode === 'upload' && tourImageFile) {
        const tourExt = tourImageFile.name.split('.').pop()
        const tourFileName = `${Date.now()}-360.${tourExt}`
        const { error: tourUploadError } = await supabase.storage
          .from('listings')
          .upload(`${session.data.session.user.id}/${tourFileName}`, tourImageFile)

        if (tourUploadError) throw tourUploadError

        const { data: tourUrlData } = supabase.storage
          .from('listings')
          .getPublicUrl(`${session.data.session.user.id}/${tourFileName}`)
        tourImagePublicUrl = tourUrlData.publicUrl
      }

      const details: Record<string, unknown> = {}
      if (values.listingType === 'land' && landSizeAcres) details.land_size_acres = Number(landSizeAcres)
      if (values.listingType === 'long_term_rent' && leaseTermMonths) details.lease_term_months = Number(leaseTermMonths)
      if (values.listingType === 'short_term_rent' && minimumStayNights) details.minimum_stay_nights = Number(minimumStayNights)
      if (exactLocation) details.exact_location = exactLocation
      if (distanceToRoad) details.distance_to_road = distanceToRoad
      if (contactPhone) details.contact_phone = contactPhone
      if (caretakerName) details.caretaker_name = caretakerName
      if (caretakerPhone) details.caretaker_phone = caretakerPhone
      const nearby = nearbyInput.split(',').map((n) => n.trim()).filter(Boolean)
      if (nearby.length) details.nearby = nearby

      const amenities = amenitiesInput
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)

      const { listingType: _listingType, ...restValues } = values

      // Create listing
      const { error: dbError } = await supabase
        .from('listings')
        .insert([
          {
            ...restValues,
            listing_type: values.listingType,
            bedrooms: isResidential ? values.bedrooms : 0,
            bathrooms: isResidential ? values.bathrooms : 0,
            amenities,
            details,
            image_url: urlData.publicUrl,
            virtual_tour_url: tourMode === 'link' ? trimmedTourUrl : null,
            virtual_tour_image_url: tourImagePublicUrl,
            created_by: session.data.session.user.id,
          },
        ])

      if (dbError) throw dbError

      toast.success('Listing created successfully!')
      form.reset()
      setImageFile(null)
      setImagePreview(null)
      setAmenitiesInput('')
      setLandSizeAcres('')
      setLeaseTermMonths('')
      setMinimumStayNights('')
      setExactLocation('')
      setDistanceToRoad('')
      setNearbyInput('')
      setContactPhone('')
      setCaretakerName('')
      setCaretakerPhone('')
      setTourMode('none')
      setVirtualTourUrl('')
      setVirtualTourUrlError('')
      setTourImageFile(null)
      setTourImagePreview(null)
      onOpenChange(false)
      onListingCreated()
    } catch (error) {
      console.error('Error creating listing:', error)
      toast.error('Failed to create listing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-neutral-200 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-neutral-900">
            List Your Property
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            Fill in the details to create a new property listing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Image Upload */}
          <div>
            <Label className="text-neutral-900 mb-3 block">Property Image</Label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:border-neutral-400 transition-colors bg-neutral-50"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                    <span className="text-neutral-500 text-sm">
                      Click to upload image
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Listing Type */}
          <div>
            <Label className="text-neutral-900 mb-2 block">Listing Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LISTING_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => form.setValue('listingType', t.value)}
                  className={`text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
                    listingType === t.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-neutral-900 mb-2 block">Property Title</Label>
            <Input
              placeholder="e.g., Luxury 3BR Apartment in Kilimani"
              {...form.register('title')}
              className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div>
            <Label className="text-neutral-900 mb-2 block">Location</Label>
            <Input
              placeholder="e.g., Kilimani, Nairobi"
              {...form.register('location')}
              className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
            />
            {form.formState.errors.location && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.location.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label className="text-neutral-900 mb-2 block">Description</Label>
            <Textarea
              placeholder="Describe the property details, amenities, etc."
              {...form.register('description')}
              className="bg-white border-neutral-200 text-neutral-900 rounded-xl min-h-32"
            />
            {form.formState.errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Price */}
          <div>
            <Label className="text-neutral-900 mb-2 block">{priceLabel}</Label>
            <Input
              type="number"
              placeholder="e.g., 50000"
              {...form.register('price', { valueAsNumber: true })}
              className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
            />
            {form.formState.errors.price && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.price.message}
              </p>
            )}
          </div>

          {/* Bedrooms, Bathrooms, Area — residential types only */}
          {isResidential ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-neutral-900 mb-2 block">Bedrooms</Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...form.register('bedrooms', { valueAsNumber: true })}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-neutral-900 mb-2 block">Bathrooms</Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...form.register('bathrooms', { valueAsNumber: true })}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-neutral-900 mb-2 block">Area (m²)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...form.register('area', { valueAsNumber: true })}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-neutral-900 mb-2 block">
                  {listingType === 'land' ? 'Plot Size (m²)' : 'Floor Area (m²)'}
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...form.register('area', { valueAsNumber: true })}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
              {listingType === 'land' && (
                <div>
                  <Label className="text-neutral-900 mb-2 block">Land Size (acres)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 0.5"
                    value={landSizeAcres}
                    onChange={(e) => setLandSizeAcres(e.target.value)}
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                  />
                </div>
              )}
            </div>
          )}

          {/* Type-specific extra field */}
          {listingType === 'long_term_rent' && (
            <div>
              <Label className="text-neutral-900 mb-2 block">Lease Term (months)</Label>
              <Input
                type="number"
                placeholder="e.g., 12"
                value={leaseTermMonths}
                onChange={(e) => setLeaseTermMonths(e.target.value)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
              />
            </div>
          )}
          {listingType === 'short_term_rent' && (
            <div>
              <Label className="text-neutral-900 mb-2 block">Minimum Stay (nights)</Label>
              <Input
                type="number"
                placeholder="e.g., 2"
                value={minimumStayNights}
                onChange={(e) => setMinimumStayNights(e.target.value)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
              />
            </div>
          )}

          {/* Amenities */}
          <div>
            <Label className="text-neutral-900 mb-2 block">Amenities</Label>
            <Input
              placeholder="e.g., borehole water, secure parking, fitted wardrobes (comma-separated)"
              value={amenitiesInput}
              onChange={(e) => setAmenitiesInput(e.target.value)}
              className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
            />
          </div>

          {/* 360 Virtual Tour */}
          <div>
            <Label className="text-neutral-900 mb-2 flex items-center gap-1.5">
              <View className="w-4 h-4 text-neutral-500" />
              360° Virtual Tour (optional)
            </Label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { value: 'none' as const, label: 'No tour' },
                { value: 'link' as const, label: 'I have a tour link' },
                { value: 'upload' as const, label: 'Upload 360 photo' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTourMode(opt.value)}
                  className={`text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
                    tourMode === opt.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {tourMode === 'link' && (
              <div>
                <Input
                  placeholder="https://kuula.co/share/..."
                  value={virtualTourUrl}
                  onChange={(e) => { setVirtualTourUrl(e.target.value); setVirtualTourUrlError('') }}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
                {virtualTourUrlError ? (
                  <p className="text-red-500 text-sm mt-1">{virtualTourUrlError}</p>
                ) : (
                  <p className="text-xs text-neutral-500 mt-1">
                    No 360 camera? Shoot the tour with the free Kuula app, then Share → copy the link and paste it here.
                  </p>
                )}
              </div>
            )}

            {tourMode === 'upload' && (
              <div>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTourImageChange}
                    className="hidden"
                    id="tour-image-upload"
                  />
                  <label
                    htmlFor="tour-image-upload"
                    className="flex items-center justify-center w-full h-32 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:border-neutral-400 transition-colors bg-neutral-50"
                  >
                    {tourImagePreview ? (
                      <img
                        src={tourImagePreview}
                        alt="360 tour preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <View className="w-8 h-8 text-neutral-400 mb-2" />
                        <span className="text-neutral-500 text-sm">Click to upload 360° photo</span>
                      </div>
                    )}
                  </label>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  This is for landlords with a real 360 camera (e.g. Ricoh Theta, Insta360) that outputs a single panoramic photo — not a regular phone photo. We host and display it directly, no third-party app needed.
                </p>
              </div>
            )}
          </div>

          {/* Location & Contact Details — everything a house-hunter needs to not have to ask anyone else */}
          <div className="space-y-4 pt-2 border-t border-neutral-100">
            <p className="text-sm font-semibold text-neutral-900 pt-4">Location &amp; Contact Details</p>
            <p className="text-xs text-neutral-500 -mt-2">
              The more specific you are here, the fewer back-and-forth calls you&apos;ll get.
            </p>
            <div>
              <Label className="text-neutral-900 mb-2 block">Exact Location / Landmark</Label>
              <Input
                placeholder="e.g., Blue Gate Apartments, off Ngong Rd, next to Total petrol station"
                value={exactLocation}
                onChange={(e) => setExactLocation(e.target.value)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-neutral-900 mb-2 block">Distance to Main Road</Label>
              <Input
                placeholder="e.g., 5 min walk to tarmac road"
                value={distanceToRoad}
                onChange={(e) => setDistanceToRoad(e.target.value)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-neutral-900 mb-2 block">Nearby Places</Label>
              <Input
                placeholder="e.g., Naivas supermarket 3 min, primary school 5 min, matatu stage 2 min (comma-separated)"
                value={nearbyInput}
                onChange={(e) => setNearbyInput(e.target.value)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-neutral-900 mb-2 block">Contact Phone for this Listing</Label>
              <Input
                placeholder="+254 7XX XXX XXX — defaults to your account phone if left blank"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-neutral-900 mb-2 block">Caretaker Name (optional)</Label>
                <Input
                  placeholder="e.g., John"
                  value={caretakerName}
                  onChange={(e) => setCaretakerName(e.target.value)}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-neutral-900 mb-2 block">Caretaker Phone (optional)</Label>
                <Input
                  placeholder="+254 7XX XXX XXX"
                  value={caretakerPhone}
                  onChange={(e) => setCaretakerPhone(e.target.value)}
                  className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 bg-white border-neutral-200 text-neutral-900 rounded-xl hover:bg-neutral-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Listing'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
