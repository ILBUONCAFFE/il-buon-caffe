import { ImageResponse } from 'next/og'
import { getProductBySlug } from '@/actions/products'
import { getWineDetailsForProduct } from '@/content/products/wineData'

export const runtime = 'edge'

export const alt = 'Wino z oferty Il Buon Caffe'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug)

  if (!product) {
    return new Response('Not found', { status: 404 })
  }

  const wineDetails = await getWineDetailsForProduct(product)
  const imageUrl = product.image || product.imageUrl

  // Build detail items
  const details: string[] = []
  if (product.origin) details.push(product.origin)
  if (wineDetails?.grape) details.push(wineDetails.grape)
  if (wineDetails?.alcohol) details.push(wineDetails.alcohol)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#1a0e0e',
          fontFamily: 'serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent stripe top */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '4px',
          backgroundColor: '#7B2D3B',
          display: 'flex',
        }} />

        {/* Left content area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '580px',
          padding: '50px 0 50px 60px',
        }}>

          {/* Brand badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex',
              padding: '5px 14px',
              border: '1px solid #6b5a3a',
              borderRadius: '4px',
            }}>
              <span style={{
                color: '#C4A97D',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
              }}>
                Il Buon Caffe
              </span>
            </div>
            <div style={{
              width: '40px',
              height: '1px',
              backgroundColor: '#6b5a3a',
              marginLeft: '12px',
              display: 'flex',
            }} />
          </div>

          {/* Wine name */}
          <div style={{
            display: 'flex',
            fontSize: '48px',
            fontWeight: 400,
            color: '#F5EDE4',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            marginBottom: '22px',
            maxWidth: '520px',
          }}>
            {product.name}
          </div>

          {/* Details as text line */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '32px',
            maxWidth: '520px',
          }}>
            {details.map((detail, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {i > 0 && (
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: '#8A7E72',
                    display: 'flex',
                  }} />
                )}
                <span style={{
                  color: '#a89a8a',
                  fontSize: '16px',
                  fontFamily: 'sans-serif',
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  {detail}
                </span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
            marginBottom: '28px',
          }}>
            <span style={{
              fontSize: '60px',
              fontWeight: 500,
              color: '#F5EDE4',
              letterSpacing: '-0.02em',
            }}>
              {product.price.toFixed(0)}
            </span>
            <span style={{
              fontSize: '26px',
              fontWeight: 300,
              color: '#8A7E72',
            }}>
              ,{(product.price % 1).toFixed(2).slice(2)} zł
            </span>
          </div>

          {/* CTA button */}
          <div style={{
            display: 'flex',
            padding: '10px 22px',
            borderRadius: '6px',
            backgroundColor: '#7B2D3B',
            width: '190px',
          }}>
            <span style={{
              color: '#F5EDE4',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontFamily: 'sans-serif',
            }}>
              Odkryj smak →
            </span>
          </div>
        </div>

        {/* Right side: bottle area */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
          height: '100%',
          position: 'relative',
        }}>
          {/* Glow behind the bottle */}
          <div style={{
            position: 'absolute',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            backgroundColor: 'rgba(123,45,59,0.25)',
            display: 'flex',
          }} />

          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              width={260}
              height={520}
              style={{
                objectFit: 'contain',
              }}
            />
          )}
        </div>

        {/* Bottom-right watermark */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          right: '36px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '24px',
            height: '1px',
            backgroundColor: '#6b5a3a',
            display: 'flex',
          }} />
          <span style={{
            color: '#6b5a3a',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}>
            ilbuoncaffe.pl
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
