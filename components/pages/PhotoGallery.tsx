'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Image as ImageIcon,
  Upload,
  X,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Camera,
  Building,
  Wrench,
  Users,
  FileText,
  Tag,
  Calendar,
  Download,
  Share2,
  Heart,
  MessageSquare,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react'

interface Photo {
  id: string
  user_id: string
  title: string | null
  description: string | null
  file_url: string
  file_name: string
  file_size: number
  mime_type: string
  category: string
  tags: string[]
  is_public: boolean
  uploaded_at: string
  updated_at: string
  profiles?: {
    full_name: string
    email: string
    role: string
  }
}

interface PhotoGalleryProps {
  user: User | null
}

const CATEGORIES = [
  { value: 'property', label: 'Property Photos', icon: Building, color: 'bg-blue-500' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-orange-500' },
  { value: 'community', label: 'Community', icon: Users, color: 'bg-purple-500' },
  { value: 'personal', label: 'Personal', icon: Camera, color: 'bg-pink-500' },
  { value: 'general', label: 'General', icon: FileText, color: 'bg-gray-500' }
]

export default function PhotoGallery({ user }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showPublicOnly, setShowPublicOnly] = useState(false)
  
  // Upload form states
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadCategory, setUploadCategory] = useState('general')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadIsPublic, setUploadIsPublic] = useState(false)
  
  // Edit states
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    
    const fetchProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setRole(profile?.role || null)
    }
    
    fetchProfile()
    fetchPhotos()
  }, [user])

  const fetchPhotos = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (role === 'landlord') {
        // Landlords can see all photos
      } else {
        // Tenants see their own photos + public photos
        params.append('userId', user!.id)
      }
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      
      if (showPublicOnly) {
        params.append('isPublic', 'true')
      }

      const response = await fetch(`/api/photos?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        // Fetch user profiles for each photo
        const photosWithProfiles = await Promise.all(
          data.photos.map(async (photo: Photo) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email, role')
              .eq('id', photo.user_id)
              .single()
            return { ...photo, profiles: profile }
          })
        )
        setPhotos(photosWithProfiles)
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !user) return
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('title', uploadTitle)
      formData.append('description', uploadDescription)
      formData.append('category', uploadCategory)
      formData.append('tags', uploadTags)
      formData.append('isPublic', uploadIsPublic.toString())
      formData.append('userId', user.id)

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (response.ok) {
        fetchPhotos()
        setShowUploadModal(false)
        resetUploadForm()
      } else {
        alert(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photoId: string) => {
    if (!user) return
    
    if (!confirm('Are you sure you want to delete this photo?')) return
    
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user!.id
        }
      })

      if (response.ok) {
        fetchPhotos()
        setSelectedPhoto(null)
      } else {
        const data = await response.json()
        alert(data.error || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Delete failed')
    }
  }

  const handleUpdate = async () => {
    if (!editingPhoto || !user) return
    
    try {
      const updates = {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean),
        is_public: editIsPublic
      }

      const response = await fetch(`/api/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(updates)
      })

      const data = await response.json()
      
      if (response.ok) {
        setEditingPhoto(null)
        fetchPhotos()
      } else {
        alert(data.error || 'Update failed')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Update failed')
    }
  }

  const resetUploadForm = () => {
    setUploadFile(null)
    setUploadTitle('')
    setUploadDescription('')
    setUploadCategory('general')
    setUploadTags('')
    setUploadIsPublic(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const resetEditForm = () => {
    setEditingPhoto(null)
    setEditTitle('')
    setEditDescription('')
    setEditCategory('')
    setEditTags('')
    setEditIsPublic(false)
  }

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = !searchQuery || 
      photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesSearch
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner-luxury"></div>
      </div>
    )
  }

  return (
    <div className="dark-bg min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif", color: '#f5f0e8' }}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-primary text-luxury-heading">Photo Gallery</h2>
            <div className="gold-divider" />
            <p className="text-sm text-secondary">
              {role === 'landlord' 
                ? `Manage all property photos (${photos.length} total)`
                : `Your photos and public gallery (${filteredPhotos.length} visible)`
              }
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-luxury"
          >
            <Upload className="w-4 h-4" />
            Upload Photo
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-secondary" />
            <Input
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-luxury"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg hover:bg-card border border-border"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
            
            {role !== 'landlord' && (
              <button
                onClick={() => setShowPublicOnly(!showPublicOnly)}
                className={`p-2 rounded-lg hover:bg-card border ${showPublicOnly ? 'border-accent' : 'border-border'}`}
              >
                {showPublicOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Photos Grid/List */}
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-secondary/30" />
            <p className="text-secondary">No photos found. Upload your first photo to get started.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-luxury mt-4"
            >
              <Upload className="w-4 h-4" />
              Upload Photo
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-4"
          }>
            {filteredPhotos.map((photo) => {
              const category = CATEGORIES.find(cat => cat.value === photo.category)
              const CategoryIcon = category?.icon || FileText
              
              if (viewMode === 'grid') {
                return (
                  <Card key={photo.id} className="card-luxury overflow-hidden group cursor-pointer">
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={photo.file_url}
                        alt={photo.title || 'Photo'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setSelectedPhoto(photo)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full ${category?.color || 'bg-gray-500'} flex items-center justify-center`}>
                              <CategoryIcon className="w-3 h-3 text-white" />
                            </div>
                            {photo.is_public && (
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <Eye className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          {photo.user_id === user?.id && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingPhoto(photo)
                                  setEditTitle(photo.title || '')
                                  setEditDescription(photo.description || '')
                                  setEditCategory(photo.category)
                                  setEditTags(photo.tags.join(', '))
                                  setEditIsPublic(photo.is_public)
                                }}
                                className="p-1.5 rounded hover:bg-card border border-border"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(photo.id)}
                                className="p-1.5 rounded hover:bg-destructive/10 border border-border"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-primary truncate">
                        {photo.title || 'Untitled'}
                      </h4>
                      <p className="text-sm text-secondary truncate">
                        {photo.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-secondary">
                        <span>{photo.profiles?.full_name}</span>
                        <span>{formatDate(photo.uploaded_at)}</span>
                        <span>{formatFileSize(photo.file_size)}</span>
                      </div>
                      {photo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {photo.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="category-badge">
                              {tag}
                            </span>
                          ))}
                          {photo.tags.length > 2 && (
                            <span className="text-xs text-secondary">+{photo.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              } else {
                return (
                  <Card key={photo.id} className="card-luxury">
                    <div className="flex gap-4 p-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={photo.file_url}
                          alt={photo.title || 'Photo'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-primary">
                              {photo.title || 'Untitled'}
                            </h4>
                            <p className="text-sm text-secondary">
                              {photo.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-secondary">
                              <span>{photo.profiles?.full_name}</span>
                              <span>{formatDate(photo.uploaded_at)}</span>
                              <span>{formatFileSize(photo.file_size)}</span>
                            </div>
                            {photo.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {photo.tags.map(tag => (
                                  <span key={tag} className="category-badge">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg ${category?.color || 'bg-gray-500'} flex items-center justify-center`}>
                              <CategoryIcon className="w-4 h-4 text-white" />
                            </div>
                            {photo.is_public && (
                              <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            )}
                            {photo.user_id === user?.id && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingPhoto(photo)
                                    setEditTitle(photo.title || '')
                                    setEditDescription(photo.description || '')
                                    setEditCategory(photo.category)
                                    setEditTags(photo.tags.join(', '))
                                    setEditIsPublic(photo.is_public)
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-card border border-border"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(photo.id)}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 border border-border"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              }
            })}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6 card-luxury">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-primary">Upload Photo</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    resetUploadForm()
                  }}
                  className="p-1.5 rounded-lg hover:bg-card border border-border"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Photo</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Title</label>
                  <Input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Photo title..."
                    className="input-luxury"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Description</label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Photo description..."
                    rows={3}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Tags (comma separated)</label>
                  <Input
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="tag1, tag2, tag3..."
                    className="input-luxury"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={uploadIsPublic}
                    onChange={(e) => setUploadIsPublic(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isPublic" className="text-sm text-primary">
                    Make this photo public (visible to all tenants)
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    resetUploadForm()
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-card text-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-luxury disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Modal */}
        {editingPhoto && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6 card-luxury">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-primary">Edit Photo</h3>
                <button
                  onClick={resetEditForm}
                  className="p-1.5 rounded-lg hover:bg-card border border-border"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Title</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Photo title..."
                    className="input-luxury"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Photo description..."
                    rows={3}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Tags (comma separated)</label>
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="tag1, tag2, tag3..."
                    className="input-luxury"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsPublic"
                    checked={editIsPublic}
                    onChange={(e) => setEditIsPublic(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="editIsPublic" className="text-sm text-primary">
                    Make this photo public (visible to all tenants)
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={resetEditForm}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-card text-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="btn-luxury"
                >
                  Save Changes
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Photo Viewer Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
              
              <img
                src={selectedPhoto.file_url}
                alt={selectedPhoto.title || 'Photo'}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              
              <div className="mt-4 text-white">
                <h3 className="text-xl font-semibold">
                  {selectedPhoto.title || 'Untitled'}
                </h3>
                {selectedPhoto.description && (
                  <p className="text-white/80 mt-2">{selectedPhoto.description}</p>
                )}
                <div className="flex items-center gap-4 mt-4 text-sm text-white/60">
                  <span>By {selectedPhoto.profiles?.full_name}</span>
                  <span>{formatDate(selectedPhoto.uploaded_at)}</span>
                  <span>{formatFileSize(selectedPhoto.file_size)}</span>
                </div>
                {selectedPhoto.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedPhoto.tags.map(tag => (
                      <span key={tag} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
