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
import { Upload, Loader2 } from 'lucide-react'

const listingFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().min(3, 'Location is required'),
  price: z.number().min(1, 'Price must be greater than 0'),
  bedrooms: z.number().min(1, 'Bedrooms must be at least 1'),
  bathrooms: z.number().min(1, 'Bathrooms must be at least 1'),
  area: z.number().min(1, 'Area must be greater than 0'),
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

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      price: 0,
      bedrooms: 1,
      bathrooms: 1,
      area: 0,
    },
  })

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

  const onSubmit = async (values: ListingFormValues) => {
    if (!imageFile) {
      toast.error('Please select an image for the listing')
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

      // Create listing
      const { error: dbError } = await supabase
        .from('listings')
        .insert([
          {
            ...values,
            image_url: urlData.publicUrl,
            created_by: session.data.session.user.id,
          },
        ])

      if (dbError) throw dbError

      toast.success('Listing created successfully!')
      form.reset()
      setImageFile(null)
      setImagePreview(null)
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
            <Label className="text-neutral-900 mb-2 block">Monthly Rent (KES)</Label>
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

          {/* Bedrooms, Bathrooms, Area */}
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
