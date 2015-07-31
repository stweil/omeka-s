<?php
namespace Omeka\Theme;

class Theme
{
    /**
     * @var string
     */
    protected $id;

    /**
     * @var array
     */
    protected $ini;

    /**
     * Construct the theme.
     *
     * @param string $id The theme identifier, the directory name
     * @param array $ini The theme INI configuration
     */
    public function __construct($id, array $ini)
    {
        $this->id = $id;
        $this->ini = $ini;
    }

    /**
     * Get the theme identifier.
     *
     * @return string
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * Get the theme INI data, the entire array or by key.
     *
     * @param string $key
     * @return array|string|null
     */
    public function getIni($key = null)
    {
        if ($key) {
            return isset($this->ini[$key]) ? $this->ini[$key] : null;
        }
        return $this->ini;
    }

    /**
     * Get the name of this theme.
     *
     * @return string|null
     */
    public function getName()
    {
        return $this->getIni('name') ?: $this->getId();
    }
}
